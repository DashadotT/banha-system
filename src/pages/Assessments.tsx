import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, Eye, ListChecks, Pencil, RotateCcw, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { Button } from '../components/common/Button';
import { SortControl } from '../components/common/SortControl';
import { Td, Th, TableShell } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { EnvValue } from '../components/common/EnvValue';
import { EnvironmentalStatusInfo } from '../components/common/EnvironmentalStatusInfo';
import { ConfirmDialog, Modal } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { AssessmentForm } from '../components/assessments/AssessmentForm';
import {
  AssessmentDetailsView,
  ProgressBadge,
} from '../components/assessments/AssessmentDetailsView';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { setAssessmentPublished } from '../services/assessmentService';
import { fetchAnalysisDataset, type AnalysisRow } from '../services/analysisService';
import { exportAssessmentsCsv } from '../services/exportService';
import { fetchSettingOptions } from '../services/settingsService';
import { formatDateShort } from '../utils/dateTime';
import { assessmentTitle, distinctValues, getAssessmentState } from '../utils/assessment';
import type { GroupType } from '../types';

const GROUP_TYPES: GroupType[] = ['Experimental', 'Comparison'];

type SortField = 'date' | 'section' | 'group' | 'number' | 'classroom';

const distinct = (values: (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();

export default function Assessments() {
  const { data: rows, loading, error, refetch } = useAsync(() => fetchAnalysisDataset({ publishedOnly: true }));
  useRealtimeRefresh(['assessments', 'recordings', 'environmental_readings'], refetch);
  const { data: typeOptions } = useAsync(() => fetchSettingOptions('assessment_type'));

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState<GroupType | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [numberFilter, setNumberFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [viewTarget, setViewTarget] = useState<AnalysisRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Keep the open modal in sync with refreshed data.
  useEffect(() => {
    if (!viewTarget || !rows) return;
    const fresh = rows.find((r) => r.assessment.id === viewTarget.assessment.id);
    if (!fresh) {
      setViewTarget(null);
      setEditing(false);
    } else if (fresh !== viewTarget) {
      setViewTarget(fresh);
    }
  }, [rows, viewTarget]);

  const all = rows ?? [];
  const subjects = useMemo(() => distinct(all.map((r) => r.assessment.subject)), [all]);
  const sections = useMemo(() => distinct(all.map((r) => r.assessment.section)), [all]);
  const classrooms = useMemo(() => distinct(all.flatMap((r) => r.recordings.map((x) => x.classroom_type))), [all]);
  const schedules = useMemo(() => distinct(all.flatMap((r) => r.recordings.map((x) => x.class_schedule))), [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = all.filter((r) => {
      const a = r.assessment;
      const matchesSearch =
        !q ||
        assessmentTitle(a).toLowerCase().includes(q) ||
        (a.group?.name ?? '').toLowerCase().includes(q) ||
        r.recordings.some((rec) => rec.id.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (subjectFilter === 'all' || a.subject === subjectFilter) &&
        (sectionFilter === 'all' || a.section === sectionFilter) &&
        (groupFilter === 'all' || a.group_type === groupFilter) &&
        (typeFilter === 'all' || a.assessment_type === typeFilter) &&
        (classroomFilter === 'all' || r.recordings.some((x) => x.classroom_type === classroomFilter)) &&
        (scheduleFilter === 'all' || r.recordings.some((x) => x.class_schedule === scheduleFilter)) &&
        (!numberFilter || a.assessment_number === parseInt(numberFilter, 10)) &&
        (!dateFrom || a.assessment_date >= dateFrom) &&
        (!dateTo || a.assessment_date <= dateTo)
      );
    });

    return [...result].sort((x, y) => {
      const a = x.assessment;
      const b = y.assessment;
      let diff = 0;
      if (sortBy === 'date') diff = new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime();
      else if (sortBy === 'section') diff = (a.section ?? '').localeCompare(b.section ?? '');
      else if (sortBy === 'group') diff = (a.group_type ?? '').localeCompare(b.group_type ?? '');
      else if (sortBy === 'number') diff = (a.assessment_number ?? 0) - (b.assessment_number ?? 0);
      else if (sortBy === 'classroom') diff = (x.recordings[0]?.classroom_type ?? '').localeCompare(y.recordings[0]?.classroom_type ?? '');
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [
    all, search, subjectFilter, sectionFilter, groupFilter, typeFilter, classroomFilter,
    scheduleFilter, numberFilter, dateFrom, dateTo, sortBy, sortDirection,
  ]);

  const hasFilters =
    search || numberFilter || dateFrom || dateTo ||
    [subjectFilter, sectionFilter, groupFilter, typeFilter, classroomFilter, scheduleFilter].some((f) => f !== 'all');

  function resetFilters() {
    setSearch('');
    setSubjectFilter('all');
    setSectionFilter('all');
    setGroupFilter('all');
    setTypeFilter('all');
    setClassroomFilter('all');
    setScheduleFilter('all');
    setNumberFilter('');
    setDateFrom('');
    setDateTo('');
  }

  function closeModal() {
    setViewTarget(null);
    setEditing(false);
  }

  async function handleRemoveConfirm() {
    if (!viewTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await setAssessmentPublished(viewTarget.assessment.id, false);
      setNotice('Removed from the Assessments page. It is still available in Recordings.');
      setConfirmRemove(false);
      closeModal();
      refetch();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove this assessment.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <AppLayout title="Assessments">
      <Card className="mb-6">
        <CardHeader
          title="Assessment Filters"
          subtitle="Assessments added to this page from Recordings"
          action={
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={resetFilters} disabled={!hasFilters}>
              Reset filters
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Search">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Subject, group name, or recording ID…"
            />
          </FormField>
          <FormField label="Subject">
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Section">
            <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option value="all">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Group">
            <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as GroupType | 'all')}>
              <option value="all">All groups</option>
              {GROUP_TYPES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment Type">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {(typeOptions ?? []).map((t) => (
                <option key={t.id} value={t.value}>{t.value}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment No.">
            <Input
              type="number"
              min={1}
              value={numberFilter}
              onChange={(e) => setNumberFilter(e.target.value)}
              placeholder="Any"
            />
          </FormField>
          <FormField label="Classroom / Room Type">
            <Select value={classroomFilter} onChange={(e) => setClassroomFilter(e.target.value)}>
              <option value="all">All classrooms</option>
              {classrooms.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Class Schedule">
            <Select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value)}>
              <option value="all">All schedules</option>
              {schedules.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date From">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FormField>
          <FormField label="Date To">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Sort</span>
            <SortControl
              options={[
                { value: 'date', label: 'Date' },
                { value: 'section', label: 'Section' },
                { value: 'group', label: 'Group' },
                { value: 'number', label: 'No.' },
                { value: 'classroom', label: 'Classroom' },
              ]}
              sortBy={sortBy}
              onSortByChange={(v) => setSortBy(v as SortField)}
              direction={sortDirection}
              onDirectionChange={setSortDirection}
            />
          </div>
        </div>
      </Card>

      {loading && <LoadingState label="Loading assessments…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && rows && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
            <span>
              Showing <span className="font-semibold text-primary">{filtered.length}</span> of{' '}
              <span className="font-semibold text-primary">{all.length}</span> assessment
              {all.length === 1 ? '' : 's'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <EnvironmentalStatusInfo />
              <Button
                variant="primary"
                size="sm"
                icon={<Download size={14} />}
                disabled={filtered.length === 0}
                onClick={() => exportAssessmentsCsv(filtered)}
              >
                Download Assessments (CSV)
              </Button>
            </div>
          </div>

          {notice && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={15} />
                {notice}
              </span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={28} />}
              title="No assessments found"
              description={
                all.length === 0
                  ? 'Set “Add to Assessments” to Yes on a completed assessment in Recordings to list it here.'
                  : 'No assessments match the current filters.'
              }
            />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Assessment</Th>
                  <Th>Section</Th>
                  <Th>Group</Th>
                  <Th>Classroom</Th>
                  <Th>Schedule</Th>
                  <Th>Date</Th>
                  <Th>Recordings</Th>
                  <Th>Score %</Th>
                  <Th>Avg Temp</Th>
                  <Th>Avg Noise</Th>
                  <Th>Progress</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const a = r.assessment;
                  const dash = <span className="text-slate-300">—</span>;
                  return (
                    <tr key={a.id} className="hover:bg-surface/60">
                      <Td className="font-medium text-primary">
                        {assessmentTitle(a)}
                      </Td>
                      <Td>{a.section ?? dash}</Td>
                      <Td>
                        {a.group_type ? (
                          <Badge tone={a.group_type === 'Experimental' ? 'accent' : 'neutral'}>{a.group_type}</Badge>
                        ) : (
                          dash
                        )}
                      </Td>
                      <Td>{distinctValues(r.recordings.map((x) => x.classroom_type)).join(', ') || dash}</Td>
                      <Td>{distinctValues(r.recordings.map((x) => x.class_schedule)).join(', ') || dash}</Td>
                      <Td>{formatDateShort(a.assessment_date)}</Td>
                      <Td>
                        {a.group?.name ? (
                          <span title={r.recordings.map((x) => x.id.slice(0, 8)).join(', ')}>
                            <Badge tone="accent">{a.group.name}</Badge>{' '}
                            <span className="text-xs text-slate-500">×{r.recordings.length}</span>
                          </span>
                        ) : (
                          <Link
                            to={`/recordings/${r.recordings[0].id}`}
                            className="font-mono text-xs text-secondary-700 hover:underline"
                          >
                            {r.recordings[0].id.slice(0, 8)}
                          </Link>
                        )}
                      </Td>
                      <Td className="mono-num font-semibold text-primary">
                        {a.score_percentage !== null ? `${a.score_percentage}%` : dash}
                      </Td>
                      <Td>
                        <EnvValue metric="temperature" value={r.avgTemperature} unit="°C" />
                      </Td>
                      <Td>
                        <EnvValue metric="noise" value={r.avgNoise} unit="dBA" />
                      </Td>
                      <Td>
                        <ProgressBadge finalized={a.is_finalized} />
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(false);
                              setViewTarget(r);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          )}
        </>
      )}

      <Modal
        open={Boolean(viewTarget)}
        onClose={closeModal}
        title={viewTarget ? assessmentTitle(viewTarget.assessment) : 'Assessment'}
        size="xl"
        footer={
          viewTarget &&
          !editing && (
            <>
              <Button variant="outline" size="sm" onClick={closeModal}>
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRemoveError(null);
                  setConfirmRemove(true);
                }}
              >
                Remove from Assessments Page
              </Button>
              <Button size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )
        }
      >
        {viewTarget && editing && (
          <AssessmentForm
            embedded
            recording={viewTarget.recordings[0]}
            assessment={viewTarget.assessment}
            members={viewTarget.recordings}
            showSession={false}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              setNotice('Assessment details saved.');
              refetch();
            }}
            onReset={() => {
              closeModal();
              setNotice('Assessment details reset. The recording is back to Pending Assessment Details.');
              refetch();
            }}
          />
        )}
        {viewTarget && !editing && (
          <div className="space-y-5">
            <AssessmentDetailsView
              assessment={viewTarget.assessment}
              recordings={viewTarget.recordings}
              recordingStats={viewTarget.recordingStats}
            />
            <div className="rounded-md bg-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Environment during this assessment
                {viewTarget.recordings.length > 1 && ' (all recordings combined)'}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Avg Temperature</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">
                    <EnvValue metric="temperature" value={viewTarget.avgTemperature} unit="°C" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Avg Noise</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">
                    <EnvValue metric="noise" value={viewTarget.avgNoise} unit="dBA" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Temperature Range</dt>
                  <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                    {viewTarget.lowestTemperature !== null
                      ? `${viewTarget.lowestTemperature} – ${viewTarget.peakTemperature} °C`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Noise Range</dt>
                  <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                    {viewTarget.lowestNoise !== null ? `${viewTarget.lowestNoise} – ${viewTarget.peakNoise} dBA` : '—'}
                  </dd>
                </div>
              </dl>
            </div>
            {getAssessmentState(viewTarget.assessment, viewTarget.recordings) !== 'completed' && (
              <p className="text-xs text-rose-600">Some details are missing — edit this assessment’s details, or the classroom / schedule of its recordings, to complete them.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemoveConfirm}
        title="Remove from Assessments page"
        confirmLabel="Remove"
        loading={removing}
        error={removeError}
      >
        This assessment will no longer be listed here. Its details and recording(s) are not deleted — it stays in
        Recordings and you can add it back from there at any time.
      </ConfirmDialog>
    </AppLayout>
  );
}
