import { useMemo, useState } from 'react';
import { Archive, ArrowDownAZ, ArrowUpAZ, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { FilterBar } from '../components/common/FilterBar';
import { Select } from '../components/common/FormField';
import { Td, Th, TableShell } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { ArchiveConfirmDialog } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import { archiveAssessment } from '../services/assessmentService';
import { fetchAnalysisDataset } from '../services/analysisService';
import { fetchSettingOptions } from '../services/settingsService';
import { formatDateShort } from '../utils/dateTime';
import type { Assessment, GroupType } from '../types';

const GROUP_TYPES: GroupType[] = ['Experimental', 'Comparison'];

export default function Assessments() {
  const { data: rows, loading, error, refetch } = useAsync(() => fetchAnalysisDataset());
  const { data: typeOptions } = useAsync(() => fetchSettingOptions('assessment_type'));

  const data = useMemo(() => rows?.map((r) => r.assessment) ?? [], [rows]);
  const environmentalByAssessmentId = useMemo(() => {
    const map = new Map<string, { co2: number | null; temp: number | null; noise: number | null }>();
    (rows ?? []).forEach((r) => {
      map.set(r.assessment.id, { co2: r.avgCo2, temp: r.avgTemperature, noise: r.avgNoise });
    });
    return map;
  }, [rows]);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState<GroupType | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [archiveTarget, setArchiveTarget] = useState<Assessment | null>(null);
  const [archiving, setArchiving] = useState(false);

  const subjects = useMemo(
    () => Array.from(new Set((data ?? []).map((a) => a.subject))).sort(),
    [data]
  );
  const sections = useMemo(
    () => Array.from(new Set((data ?? []).map((a) => a.section))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const result = (data ?? []).filter((a) => {
      const matchesSearch =
        !search ||
        String(a.assessment_number).includes(search.toLowerCase()) ||
        a.subject.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subjectFilter === 'all' || a.subject === subjectFilter;
      const matchesSection = sectionFilter === 'all' || a.section === sectionFilter;
      const matchesGroup = groupFilter === 'all' || a.group_type === groupFilter;
      const matchesType = typeFilter === 'all' || a.assessment_type === typeFilter;
      const matchesDate = !dateFilter || a.assessment_date === dateFilter;
      return matchesSearch && matchesSubject && matchesSection && matchesGroup && matchesType && matchesDate;
    });
    return result.sort((a, b) => {
      const diff = new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime();
      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [data, search, subjectFilter, sectionFilter, groupFilter, typeFilter, dateFilter, sortOrder]);

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveAssessment(archiveTarget.id);
      setArchiveTarget(null);
      refetch();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <AppLayout title="Assessments">
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by number or subject…">
        <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-auto">
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="w-auto">
          <option value="all">All sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as GroupType | 'all')} className="w-auto">
          <option value="all">All groups</option>
          {GROUP_TYPES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
          <option value="all">All types</option>
          {(typeOptions ?? []).map((t) => (
            <option key={t.id} value={t.value}>
              {t.value}
            </option>
          ))}
        </Select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          aria-label="Filter by date"
        />
        <button
          onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-surface"
          title={sortOrder === 'desc' ? 'Sort: Latest to Oldest' : 'Sort: Oldest to Latest'}
        >
          {sortOrder === 'desc' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
          {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
        </button>
      </FilterBar>

      {loading && <LoadingState label="Loading assessments…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<ListChecks size={28} />}
          title="No assessments found"
          description="Add assessment details from a recording to see them here."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>Subject</Th>
              <Th>Section</Th>
              <Th>Group</Th>
              <Th>Type</Th>
              <Th>No.</Th>
              <Th>Date</Th>
              <Th>Score %</Th>
              <Th>Avg CO₂</Th>
              <Th>Avg Temp</Th>
              <Th>Avg Noise</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-surface/60">
                <Td className="font-medium text-primary">{a.subject}</Td>
                <Td>{a.section}</Td>
                <Td>
                  <Badge tone={a.group_type === 'Experimental' ? 'accent' : 'neutral'}>
                    {a.group_type}
                  </Badge>
                </Td>
                <Td>{a.assessment_type}</Td>
                <Td className="mono-num">#{a.assessment_number}</Td>
                <Td>{formatDateShort(a.assessment_date)}</Td>
                <Td className="mono-num font-semibold text-primary">{a.score_percentage}%</Td>
                <Td className="mono-num text-slate-500">
                  {environmentalByAssessmentId.get(a.id)?.co2 ?? '—'}
                </Td>
                <Td className="mono-num text-slate-500">
                  {environmentalByAssessmentId.get(a.id)?.temp ?? '—'}
                </Td>
                <Td className="mono-num text-slate-500">
                  {environmentalByAssessmentId.get(a.id)?.noise ?? '—'}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/recordings/${a.recording_id}`}
                      className="rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => setArchiveTarget(a)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <ArchiveConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        itemLabel={archiveTarget ? `${archiveTarget.assessment_type} #${archiveTarget.assessment_number}` : ''}
        loading={archiving}
      />
    </AppLayout>
  );
}
