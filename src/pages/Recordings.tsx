import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Download, Eye, Layers, StickyNote, X,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { FilterBar } from '../components/common/FilterBar';
import { Select } from '../components/common/FormField';
import { SortControl } from '../components/common/SortControl';
import { Td, Th, TableShell } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { RecordingStatusBadge } from '../components/recordings/RecordingStatusBadge';
import { RecordingDetailsPanel } from '../components/recordings/RecordingDetailsPanel';
import { AssessmentGroupPanel } from '../components/recordings/AssessmentGroupPanel';
import { RecordingNoteModal } from '../components/recordings/RecordingNoteModal';
import { GroupRecordingsModal } from '../components/recordings/GroupRecordingsModal';
import { ProgressBadge, PublicationMark } from '../components/assessments/AssessmentDetailsView';
import { ArchiveConfirmDialog, Modal } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { archiveRecordings, fetchRecordingGroups, fetchRecordings } from '../services/recordingService';
import { fetchRecordingsDataset } from '../services/analysisService';
import { exportRecordingsCsv } from '../services/exportService';
import { formatDateShort, formatDuration, formatTime } from '../utils/dateTime';
import type { Recording, RecordingStatus } from '../types';

type SortField = 'date' | 'status' | 'duration';

const STATUS_ORDER: Record<RecordingStatus, number> = {
  recording: 0,
  pending_assessment: 1,
  incomplete_assessment: 2,
  completed: 3,
};

/** A table row is either one ungrouped recording or a whole assessment group. */
type Row =
  | { kind: 'recording'; key: string; recording: Recording }
  | { kind: 'group'; key: string; groupId: string; name: string; members: Recording[] };

export default function Recordings() {
  const { data, loading, error, refetch } = useAsync(fetchRecordings);
  const { data: groups, refetch: refetchGroups } = useAsync(fetchRecordingGroups);
  useRealtimeRefresh(['recordings', 'assessments'], () => {
    refetch();
    refetchGroups();
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordingStatus | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [publishFilter, setPublishFilter] = useState<'all' | 'added' | 'not_added'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewId, setViewId] = useState<string | null>(null);
  const [groupViewId, setGroupViewId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiveTargets, setArchiveTargets] = useState<Recording[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<Recording | null>(null);
  const [groupTargets, setGroupTargets] = useState<Recording[]>([]);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Drop selections that no longer exist or have since been grouped.
  useEffect(() => {
    if (!data) return;
    const ok = new Set(data.filter((r) => !r.group_id).map((r) => r.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ok.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (data ?? []).filter((r) => {
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        (r.group?.name ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesGroup = groupFilter === 'all' || (groupFilter === 'none' ? !r.group_id : r.group_id === groupFilter);
      const matchesPublish =
        publishFilter === 'all' ||
        (publishFilter === 'added'
          ? r.assessment_info?.show_in_assessments === true
          : r.assessment_info?.show_in_assessments === false);
      const day = r.started_at.slice(0, 10);
      return matchesSearch && matchesStatus && matchesGroup && matchesPublish && (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    });
  }, [data, search, statusFilter, groupFilter, publishFilter, dateFrom, dateTo]);

  const rows: Row[] = useMemo(() => {
    const byGroup = new Map<string, Recording[]>();
    const singles: Recording[] = [];
    for (const r of filtered) {
      if (r.group_id) byGroup.set(r.group_id, [...(byGroup.get(r.group_id) ?? []), r]);
      else singles.push(r);
    }
    const built: Row[] = [
      ...singles.map((recording): Row => ({ kind: 'recording', key: recording.id, recording })),
      ...[...byGroup.entries()].map(
        ([groupId, members]): Row => ({
          kind: 'group',
          key: `group:${groupId}`,
          groupId,
          name: members[0].group?.name ?? 'Assessment group',
          members: [...members].sort((a, b) => a.started_at.localeCompare(b.started_at)),
        })
      ),
    ];
    const keyOf = (row: Row) => {
      const list = row.kind === 'group' ? row.members : [row.recording];
      if (sortBy === 'date') return Math.max(...list.map((r) => new Date(r.started_at).getTime()));
      if (sortBy === 'duration') return list.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
      return STATUS_ORDER[list[0].status];
    };
    return built.sort((a, b) => (sortDirection === 'asc' ? keyOf(a) - keyOf(b) : keyOf(b) - keyOf(a)));
  }, [filtered, sortBy, sortDirection]);

  const selectable = rows.flatMap((row) => (row.kind === 'recording' && row.recording.status !== 'recording' ? [row.recording] : []));
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const selectedRecordings = (data ?? []).filter((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function handleArchiveConfirm() {
    if (archiveTargets.length === 0) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveRecordings(archiveTargets.map((r) => r.id));
      setNotice({ tone: 'success', text: `${archiveTargets.length} recording${archiveTargets.length === 1 ? '' : 's'} archived.` });
      setSelected(new Set());
      setArchiveTargets([]);
      refetch();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Could not archive.');
    } finally {
      setArchiving(false);
    }
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      exportRecordingsCsv(await fetchRecordingsDataset());
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Export failed.' });
    } finally {
      setExporting(false);
    }
  }

  const iconBtn = 'rounded-md p-1.5 text-slate-500';
  const refreshAll = () => {
    refetch();
    refetchGroups();
  };

  function recordingActions(r: Recording, grouped: boolean) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => setViewId(r.id)} className={`${iconBtn} hover:bg-primary-50 hover:text-primary`} title="View recording">
          <Eye size={16} />
        </button>
        <button onClick={() => setNoteTarget(r)} className={`${iconBtn} hover:bg-accent-50 hover:text-accent-700`}
          title={r.notes ? 'Edit note' : 'Add note'}>
          <StickyNote size={16} />
        </button>
        {!grouped && (
          <button onClick={() => setGroupTargets([r])} disabled={r.status === 'recording'}
            className={`${iconBtn} hover:bg-secondary-50 hover:text-secondary-700 disabled:opacity-30`} title="Add to assessment group">
            <Layers size={16} />
          </button>
        )}
        <button onClick={() => setArchiveTargets([r])} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`} title="Archive recording">
          <Archive size={16} />
        </button>
      </div>
    );
  }

  return (
    <AppLayout title="Recordings">
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by ID, group, or note…">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RecordingStatus | 'all')} className="w-auto">
          <option value="all">All statuses</option>
          <option value="recording">Recording</option>
          <option value="completed">Completed</option>
          <option value="incomplete_assessment">Incomplete Assessment Details</option>
          <option value="pending_assessment">Pending Assessment Details</option>
        </Select>
        <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-auto">
          <option value="all">All recordings</option>
          <option value="none">Not grouped</option>
          {(groups ?? []).map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
        <Select value={publishFilter} onChange={(e) => setPublishFilter(e.target.value as 'all' | 'added' | 'not_added')}
          className="w-auto" aria-label="Assessments page status">
          <option value="all">Assessments: all</option>
          <option value="added">✓ Ready</option>
          <option value="not_added">✗ Not Added</option>
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500" htmlFor="recordings-date-from">From</label>
          <input id="recordings-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500" htmlFor="recordings-date-to">To</label>
          <input id="recordings-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary" />
        </div>
        <SortControl
          options={[
            { value: 'date', label: 'Date & Time' },
            { value: 'status', label: 'Status' },
            { value: 'duration', label: 'Duration' },
          ]}
          sortBy={sortBy}
          onSortByChange={(v) => setSortBy(v as SortField)}
          direction={sortDirection}
          onDirectionChange={setSortDirection}
        />
        <Button variant="outline" size="sm" icon={<Download size={14} />} loading={exporting} onClick={handleExportAll} className="py-2">
          Export All Recordings (CSV)
        </Button>
      </FilterBar>

      {notice && (
        <div className={`mb-4 flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-sm ${
          notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <span className="inline-flex items-center gap-2">
            {notice.tone === 'success' && <CheckCircle2 size={15} />}
            {notice.text}
          </span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-secondary-200 bg-secondary-50 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<Layers size={14} />} onClick={() => setGroupTargets(selectedRecordings)}>
              Group / Combine
            </Button>
            <Button size="sm" variant="outline" icon={<Archive size={14} />} onClick={() => setArchiveTargets(selectedRecordings)}>
              Archive selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {loading && <LoadingState label="Loading recordings…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={<ClipboardList size={28} />} title="No recordings found"
          description="Adjust your filters, or check back once a BANHA device starts a session." />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Recordings of the same assessment are shown as one <strong>assessment group</strong>. Open a group to see its
            combined results; open a recording from the list to see that single session.
          </p>
          <TableShell>
            <thead>
              <tr>
                <Th>
                  <input type="checkbox" checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))}
                    aria-label="Select all ungrouped recordings" disabled={selectable.length === 0} />
                </Th>
                <Th>Recording / Group</Th>
                <Th>Date</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Duration</Th>
                <Th>Status</Th>
                <Th>Assessments</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.kind === 'recording') {
                  const r = row.recording;
                  return (
                    <tr key={row.key} className={`hover:bg-surface/60 ${selected.has(r.id) ? 'bg-secondary-50/50' : ''}`}>
                      <Td>
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)}
                          disabled={r.status === 'recording'} aria-label={`Select recording ${r.id.slice(0, 8)}`} />
                      </Td>
                      <Td className="font-mono text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          {r.id.slice(0, 8)}
                          {r.notes && <span title={r.notes}><StickyNote size={13} className="text-accent-600" /></span>}
                        </span>
                      </Td>
                      <Td>{formatDateShort(r.started_at)}</Td>
                      <Td>{formatTime(r.started_at)}</Td>
                      <Td>{r.ended_at ? formatTime(r.ended_at) : '—'}</Td>
                      <Td className="mono-num">{formatDuration(r.duration_seconds)}</Td>
                      <Td><RecordingStatusBadge status={r.status} /></Td>
                      <Td>{r.assessment_info ? <PublicationMark published={r.assessment_info.show_in_assessments} /> : <span className="text-slate-300">—</span>}</Td>
                      <Td>{recordingActions(r, false)}</Td>
                    </tr>
                  );
                }

                const open = expanded.has(row.key) || groupFilter === row.groupId;
                const first = row.members[0];
                const last = row.members[row.members.length - 1];
                const info = first.assessment_info;
                const sameDay = formatDateShort(first.started_at) === formatDateShort(last.started_at);
                return (
                  <Fragment key={row.key}>
                    <tr className="bg-accent-50/30 hover:bg-accent-50/60">
                      <Td>{null}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleExpanded(row.key)} className="rounded p-0.5 text-slate-500 hover:bg-white"
                            aria-label={open ? 'Hide recordings' : 'Show recordings'}>
                            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                          <button onClick={() => setGroupViewId(row.groupId)} className="inline-flex items-center gap-2 text-left" title="Open assessment group">
                            <Layers size={14} className="text-accent-700" />
                            <span className="text-sm font-semibold text-primary hover:underline">{row.name}</span>
                          </button>
                          <ProgressBadge finalized={Boolean(info?.is_finalized)} />
                          <span className="text-xs text-slate-500">{row.members.length} recording{row.members.length === 1 ? '' : 's'}</span>
                        </div>
                      </Td>
                      <Td>{sameDay ? formatDateShort(first.started_at) : `${formatDateShort(first.started_at)} – ${formatDateShort(last.started_at)}`}</Td>
                      <Td className="text-slate-300">—</Td>
                      <Td className="text-slate-300">—</Td>
                      <Td className="mono-num">{formatDuration(row.members.reduce((s, m) => s + (m.duration_seconds ?? 0), 0))}</Td>
                      <Td><RecordingStatusBadge status={first.status} /></Td>
                      <Td>{info ? <PublicationMark published={info.show_in_assessments} /> : <span className="text-slate-300">—</span>}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setGroupViewId(row.groupId)} className={`${iconBtn} hover:bg-primary-50 hover:text-primary`} title="Open assessment group">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => setArchiveTargets(row.members)} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`} title="Archive the whole group">
                            <Archive size={16} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                    {open &&
                      row.members.map((r) => (
                        <tr key={r.id} className="hover:bg-surface/60">
                          <Td>{null}</Td>
                          <Td className="pl-12 font-mono text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              {r.id.slice(0, 8)}
                              {r.notes && <span title={r.notes}><StickyNote size={13} className="text-accent-600" /></span>}
                            </span>
                          </Td>
                          <Td>{formatDateShort(r.started_at)}</Td>
                          <Td>{formatTime(r.started_at)}</Td>
                          <Td>{r.ended_at ? formatTime(r.ended_at) : '—'}</Td>
                          <Td className="mono-num">{formatDuration(r.duration_seconds)}</Td>
                          <Td><RecordingStatusBadge status={r.status} /></Td>
                          <Td>{null}</Td>
                          <Td>{recordingActions(r, true)}</Td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </TableShell>
        </>
      )}

      <Modal open={Boolean(viewId)} onClose={() => setViewId(null)} title="Recording details" size="xl"
        footer={<Button variant="outline" size="sm" onClick={() => setViewId(null)}>Close</Button>}>
        {viewId && (
          <RecordingDetailsPanel
            key={viewId}
            recordingId={viewId}
            embedded
            onClose={() => setViewId(null)}
            onChanged={refreshAll}
            onOpenRecording={(id) => setViewId(id)}
            onOpenGroup={(gid) => {
              setViewId(null);
              setGroupViewId(gid);
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(groupViewId)} onClose={() => setGroupViewId(null)} title="Assessment group" size="xl"
        footer={<Button variant="outline" size="sm" onClick={() => setGroupViewId(null)}>Close</Button>}>
        {groupViewId && (
          <AssessmentGroupPanel
            key={groupViewId}
            groupId={groupViewId}
            onChanged={refreshAll}
            onOpenRecording={(id) => {
              setGroupViewId(null);
              setViewId(id);
            }}
          />
        )}
      </Modal>

      <ArchiveConfirmDialog
        open={archiveTargets.length > 0}
        onClose={() => setArchiveTargets([])}
        onConfirm={handleArchiveConfirm}
        itemLabel={archiveTargets.length === 1 ? `recording ${archiveTargets[0].id.slice(0, 8)}` : `${archiveTargets.length} recordings`}
        loading={archiving}
        error={archiveError}
        description="Sensor readings and assessment details are kept. Archived recordings leave the Recordings and Assessments pages and are excluded from analysis until restored from Archived Records."
      />

      <RecordingNoteModal recording={noteTarget} onClose={() => setNoteTarget(null)}
        onSaved={() => { setNotice({ tone: 'success', text: 'Note saved.' }); refetch(); }} />

      <GroupRecordingsModal
        open={groupTargets.length > 0}
        recordings={groupTargets}
        onClose={() => setGroupTargets([])}
        onGrouped={(text) => {
          setNotice({ tone: 'success', text });
          setSelected(new Set());
          refreshAll();
        }}
      />
    </AppLayout>
  );
}
