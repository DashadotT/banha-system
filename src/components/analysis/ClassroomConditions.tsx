import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Badge, levelToTone } from '../common/Badge';
import { EnvValue } from '../common/EnvValue';
import { EmptyState } from '../common/States';
import { Td, Th, TableShell } from '../common/Table';
import { MetricBarChart } from './MetricBarChart';
import {
  FLAG_SHARE,
  MIN_ASSESSMENTS_FOR_FLAG,
  byClassroom,
  bySchedule,
  classroomScheduleMatrix,
  isFlagged,
  type ConditionSummary,
} from '../../utils/classroomAnalytics';
import {
  OVERALL_LABELS,
  getNoiseLevel,
  getNoiseStatus,
  getTemperatureLevel,
  getTemperatureStatus,
  type EnvLevel,
} from '../../utils/calculations';
import type { AnalysisRow } from '../../services/analysisService';

type SortField = 'default' | 'assessments' | 'recordings' | 'avgTemperature' | 'avgNoise' | 'nonNormalShare' | 'level';

const LEVEL_RANK: Record<EnvLevel, number> = { good: 0, fair: 1, poor: 2 };

const MATRIX_CELL_BG: Record<EnvLevel, string> = {
  good: 'bg-emerald-50/40',
  fair: 'bg-amber-50/45',
  poor: 'bg-rose-50/45',
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} className="text-slate-300" />;
  return dir === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />;
}

function SummaryTable({
  title,
  overallHeader = 'Overall',
  rows,
  highlightExtremes = false,
}: {
  title: string;
  overallHeader?: string;
  rows: ConditionSummary[];
  highlightExtremes?: boolean;
}) {
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'desc') setSortDir('asc');
      else setSortField('default');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedRows = useMemo(() => {
    if (sortField === 'default') return rows;
    return [...rows].sort((a, b) => {
      let diff = 0;
      if (sortField === 'assessments') diff = a.assessments - b.assessments;
      else if (sortField === 'recordings') diff = a.recordings - b.recordings;
      else if (sortField === 'avgTemperature') diff = (a.avgTemperature ?? -Infinity) - (b.avgTemperature ?? -Infinity);
      else if (sortField === 'avgNoise') diff = (a.avgNoise ?? -Infinity) - (b.avgNoise ?? -Infinity);
      else if (sortField === 'nonNormalShare') diff = a.nonNormalShare - b.nonNormalShare;
      else if (sortField === 'level') diff = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [rows, sortField, sortDir]);

  const maxTemp = highlightExtremes && rows.length >= 2 ? Math.max(...rows.map((r) => r.avgTemperature ?? -Infinity)) : null;
  const maxNoise = highlightExtremes && rows.length >= 2 ? Math.max(...rows.map((r) => r.avgNoise ?? -Infinity)) : null;
  const maxShare =
    highlightExtremes && rows.length >= 2 ? Math.max(...rows.map((r) => r.nonNormalShare)) : null;

  const sortableHeader = (label: string, field: SortField, alignRight = false) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-primary ${
        alignRight ? 'ml-auto' : ''
      }`}
    >
      {label}
      <SortIcon active={sortField === field} dir={sortDir} />
    </button>
  );

  return (
    <TableShell scrollable={false}>
      <thead>
        <tr>
          <Th>{title}</Th>
          <Th className="text-right">{sortableHeader('Assessments', 'assessments', true)}</Th>
          <Th className="text-right">{sortableHeader('Recordings', 'recordings', true)}</Th>
          <Th>{sortableHeader('Average Temperature', 'avgTemperature')}</Th>
          <Th>{sortableHeader('Average Noise', 'avgNoise')}</Th>
          <Th>{sortableHeader('Fair / Poor', 'nonNormalShare')}</Th>
          <Th>{sortableHeader(overallHeader, 'level')}</Th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((r) => {
          const flagged = isFlagged(r);
          const affected = r.fairCount + r.poorCount;
          const pct = Math.round(r.nonNormalShare * 100);
          const isPeakTemp = maxTemp !== null && r.avgTemperature !== null && r.avgTemperature === maxTemp;
          const isPeakNoise = maxNoise !== null && r.avgNoise !== null && r.avgNoise === maxNoise;
          const isPeakShare = maxShare !== null && maxShare > 0 && r.nonNormalShare === maxShare;

          return (
            <tr key={r.label} className="transition-colors hover:bg-slate-50/75">
              <Td className="py-3.5 font-medium text-primary">
                <span className="inline-flex items-center gap-2">
                  <span>{r.label}</span>
                  {flagged && (
                    <span
                      title={`Flagged: ${affected} of ${r.assessments} assessments (${pct}%) were Fair or Poor`}
                      className="inline-flex items-center text-amber-600"
                    >
                      <AlertTriangle size={14} aria-label="Frequently fair or poor" />
                    </span>
                  )}
                </span>
              </Td>
              <Td className="mono-num py-3.5 text-right font-medium text-slate-700">{r.assessments}</Td>
              <Td className="mono-num py-3.5 text-right text-slate-600">{r.recordings}</Td>
              <Td className="py-3.5">
                <div className="inline-flex items-center gap-2">
                  <EnvValue metric="temperature" value={r.avgTemperature} unit="°C" />
                  {isPeakTemp && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Highest
                    </span>
                  )}
                </div>
              </Td>
              <Td className="py-3.5">
                <div className="inline-flex items-center gap-2">
                  <EnvValue metric="noise" value={r.avgNoise} unit="dBA" />
                  {isPeakNoise && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Highest
                    </span>
                  )}
                </div>
              </Td>
              <Td className="py-3.5">
                <div className="inline-flex items-center gap-2">
                  <span className="mono-num text-sm text-slate-700">
                    {affected} / {r.assessments}
                  </span>
                  <span
                    className={`mono-num rounded px-1.5 py-0.5 text-xs font-medium ${
                      pct === 0
                        ? 'bg-slate-100 text-slate-500'
                        : r.poorCount > 0 && flagged
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {pct}%
                  </span>
                  {isPeakShare && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Most
                    </span>
                  )}
                </div>
              </Td>
              <Td className="py-3.5">
                <Badge tone={levelToTone(r.level)} dot>
                  {OVERALL_LABELS[r.level]}
                </Badge>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );
}

function ScheduleHighlights({ schedules }: { schedules: ConditionSummary[] }) {
  if (schedules.length < 2) return null;

  const withTemp = schedules.filter((s) => s.avgTemperature !== null);
  const withNoise = schedules.filter((s) => s.avgNoise !== null);
  const maxTempVal = withTemp.length ? Math.max(...withTemp.map((s) => s.avgTemperature as number)) : null;
  const maxNoiseVal = withNoise.length ? Math.max(...withNoise.map((s) => s.avgNoise as number)) : null;
  const maxShareVal = Math.max(...schedules.map((s) => s.nonNormalShare));

  const tempLeaders = maxTempVal !== null ? withTemp.filter((s) => s.avgTemperature === maxTempVal) : [];
  const noiseLeaders = maxNoiseVal !== null ? withNoise.filter((s) => s.avgNoise === maxNoiseVal) : [];
  const shareLeaders = maxShareVal > 0 ? schedules.filter((s) => s.nonNormalShare === maxShareVal) : [];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-md border border-border bg-surface/70 px-3.5 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Highest Avg Temperature</p>
        {tempLeaders.length > 0 && maxTempVal !== null ? (
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-semibold text-primary" title={tempLeaders.map((s) => s.label).join(', ')}>
              {tempLeaders.map((s) => s.label).join(', ')}
            </span>
            <EnvValue metric="temperature" value={maxTempVal} unit="°C" />
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">—</p>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface/70 px-3.5 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Highest Avg Noise</p>
        {noiseLeaders.length > 0 && maxNoiseVal !== null ? (
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-semibold text-primary" title={noiseLeaders.map((s) => s.label).join(', ')}>
              {noiseLeaders.map((s) => s.label).join(', ')}
            </span>
            <EnvValue metric="noise" value={maxNoiseVal} unit="dBA" />
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">—</p>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface/70 px-3.5 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Most Frequent Fair / Poor</p>
        {shareLeaders.length > 0 ? (
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-semibold text-primary" title={shareLeaders.map((s) => s.label).join(', ')}>
              {shareLeaders.map((s) => s.label).join(', ')}
            </span>
            <span className="mono-num shrink-0 text-xs font-semibold text-primary">
              {Math.round(maxShareVal * 100)}%
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">None (0% across all schedules)</p>
        )}
      </div>
    </div>
  );
}

const toBars = (rows: ConditionSummary[], metric: 'temperature' | 'noise') =>
  rows
    .filter((r) => (metric === 'temperature' ? r.avgTemperature : r.avgNoise) !== null)
    .map((r) => {
      const value = (metric === 'temperature' ? r.avgTemperature : r.avgNoise) as number;
      return {
        label: r.label,
        value,
        n: r.assessments,
        level: metric === 'temperature' ? getTemperatureLevel(value) : getNoiseLevel(value),
        status: metric === 'temperature' ? getTemperatureStatus(value) : getNoiseStatus(value),
      };
    });

export function ClassroomConditions({ rows }: { rows: AnalysisRow[] }) {
  const classrooms = byClassroom(rows);
  const schedules = bySchedule(rows);
  const matrix = classroomScheduleMatrix(rows);
  const missingClassroom = rows.filter((r) => !r.recordings.some((x) => x.classroom_type)).length;
  const flagged = classrooms.filter(isFlagged).sort((a, b) => b.nonNormalShare - a.nonNormalShare);

  if (classrooms.length === 0 && schedules.length === 0) {
    return (
      <EmptyState
        title="No classroom or schedule details saved yet"
        description="Add Classroom / Room Type and Class Schedule to your assessment details to compare environmental conditions across classrooms."
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Classroom and schedule are recorded per session, so one assessment can appear in several classrooms. Readings are
        pooled from every individual measurement (never an average of averages), and an assessment counts once per
        classroom.
        {missingClassroom > 0 &&
          ` ${missingClassroom} assessment${missingClassroom === 1 ? ' has' : 's have'} no classroom saved and ${
            missingClassroom === 1 ? 'is' : 'are'
          } left out of the classroom comparison.`}
      </p>

      {matrix.classrooms.length >= 1 && matrix.schedules.length >= 2 && (
        <Card>
          <CardHeader
            title="Classroom × Schedule Matrix"
            subtitle="Condition classification, average temperature, average noise, and assessment/recording counts per classroom and schedule"
          />
          <TableShell scrollable={false}>
            <thead>
              <tr>
                <Th className="min-w-[160px] bg-surface">Classroom / Room Type</Th>
                {matrix.schedules.map((s) => (
                  <Th key={s} className="min-w-[200px] border-l border-border bg-surface">
                    {s}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.classrooms.map((c) => (
                <tr key={c} className="hover:bg-slate-50/40">
                  <Td className="py-4 font-semibold text-primary">{c}</Td>
                  {matrix.schedules.map((s) => {
                    const cell = matrix.cells.get(`${c}||${s}`);
                    if (!cell) {
                      return (
                        <Td key={s} className="border-l border-border bg-slate-50/50 py-4 text-center">
                          <span className="text-sm text-slate-300" aria-label="No data">
                            —
                          </span>
                        </Td>
                      );
                    }
                    return (
                      <Td key={s} className={`border-l border-border py-3.5 align-top ${MATRIX_CELL_BG[cell.level]}`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone={levelToTone(cell.level)} dot>
                              {OVERALL_LABELS[cell.level]}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              <span className="mono-num font-medium text-slate-700">{cell.assessments}</span>{' '}
                              {cell.assessments === 1 ? 'assessment' : 'assessments'} ·{' '}
                              <span className="mono-num font-medium text-slate-700">{cell.recordings}</span> rec.
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="block text-[11px] text-slate-500">Avg Temp</span>
                              <div className="mt-0.5 font-medium">
                                <EnvValue metric="temperature" value={cell.avgTemperature} unit="°C" />
                              </div>
                            </div>
                            <div>
                              <span className="block text-[11px] text-slate-500">Avg Noise</span>
                              <div className="mt-0.5 font-medium">
                                <EnvValue metric="noise" value={cell.avgNoise} unit="dBA" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}

      {classrooms.length > 0 && (
        <>
          <Card>
            <CardHeader
              title="Conditions by Classroom / Room Type"
              subtitle="Average of each classroom's assessments, coloured by the study's temperature and noise ranges"
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Average Temperature (°C)
                </p>
                <MetricBarChart
                  data={toBars(classrooms, 'temperature')}
                  unit="°C"
                  metric="temperature"
                  yAxisLabel="Temperature (°C)"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Average Noise (dBA)
                </p>
                <MetricBarChart
                  data={toBars(classrooms, 'noise')}
                  unit="dBA"
                  metric="noise"
                  yAxisLabel="Noise Level (dBA)"
                />
              </div>
            </div>
            <div className="mt-6">
              <SummaryTable title="Classroom / Room Type" overallHeader="Overall Condition" rows={classrooms} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Classrooms with Frequent Fair or Poor Conditions"
              subtitle={`Flagged when at least ${Math.round(FLAG_SHARE * 100)}% of a classroom's assessments were Fair or Poor (minimum ${MIN_ASSESSMENTS_FOR_FLAG} assessments)`}
            />
            {flagged.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/40 px-3.5 py-2.5 text-sm text-slate-600">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>
                  No classroom is currently flagged
                  {classrooms.every((c) => c.assessments < MIN_ASSESSMENTS_FOR_FLAG)
                    ? ' — more assessments per classroom are needed for a reliable comparison.'
                    : '.'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {flagged.map((c) => {
                  const affected = c.fairCount + c.poorCount;
                  const pct = Math.round(c.nonNormalShare * 100);
                  const fairPct = c.assessments > 0 ? (c.fairCount / c.assessments) * 100 : 0;
                  const poorPct = c.assessments > 0 ? (c.poorCount / c.assessments) * 100 : 0;

                  return (
                    <div
                      key={c.label}
                      className="rounded-lg border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              size={15}
                              className={`shrink-0 ${c.poorCount > 0 ? 'text-rose-500' : 'text-amber-500'}`}
                              aria-hidden="true"
                            />
                            <h4 className="truncate text-sm font-semibold text-primary">{c.label}</h4>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600">
                            <span className="mono-num text-sm font-semibold text-primary">
                              {affected} of {c.assessments}
                            </span>{' '}
                            assessment{c.assessments === 1 ? '' : 's'} affected ({c.fairCount} Fair · {c.poorCount} Poor)
                          </p>
                        </div>
                        <span
                          className={`mono-num shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                            c.poorCount > 0
                              ? 'bg-rose-50 text-rose-700 ring-rose-200'
                              : 'bg-amber-50 text-amber-700 ring-amber-200'
                          }`}
                        >
                          {pct}% Fair/Poor
                        </span>
                      </div>

                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="flex h-full">
                          {poorPct > 0 && <div className="bg-rose-500" style={{ width: `${poorPct}%` }} />}
                          {fairPct > 0 && <div className="bg-amber-400" style={{ width: `${fairPct}%` }} />}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <EnvValue metric="temperature" value={c.avgTemperature} unit="°C" />
                        <EnvValue metric="noise" value={c.avgNoise} unit="dBA" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {schedules.length > 0 && (
        <Card>
          <CardHeader
            title="Conditions by Class Schedule"
            subtitle="Average of each schedule's assessments in chronological order"
          />
          {schedules.length < 2 && (
            <p className="mb-3 text-xs text-slate-500">
              Only one schedule has data so far — add assessments from other schedules to compare them.
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Average Temperature (°C)
              </p>
              <MetricBarChart
                data={toBars(schedules, 'temperature')}
                unit="°C"
                metric="temperature"
                yAxisLabel="Temperature (°C)"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Average Noise (dBA)
              </p>
              <MetricBarChart
                data={toBars(schedules, 'noise')}
                unit="dBA"
                metric="noise"
                yAxisLabel="Noise Level (dBA)"
              />
            </div>
          </div>
          <div className="mt-6">
            <ScheduleHighlights schedules={schedules} />
            <SummaryTable title="Class Schedule" overallHeader="Overall" rows={schedules} highlightExtremes />
          </div>
        </Card>
      )}
    </div>
  );
}
