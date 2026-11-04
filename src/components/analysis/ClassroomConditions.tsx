import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Badge, statusToTone } from '../common/Badge';
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
import { getNoiseStatus, getTemperatureStatus } from '../../utils/calculations';
import type { AnalysisRow } from '../../services/analysisService';

function SummaryTable({ title, rows }: { title: string; rows: ConditionSummary[] }) {
  return (
    <TableShell scrollable={false}>
      <thead>
        <tr>
          <Th>{title}</Th>
          <Th>Assessments</Th>
          <Th>Recordings</Th>
          <Th>Avg Temp</Th>
          <Th>Avg Noise</Th>
          <Th>Moderate / Poor</Th>
          <Th>Overall</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <Td className="font-medium text-primary">
              <span className="inline-flex items-center gap-1.5">
                {r.label}
                {isFlagged(r) && <AlertTriangle size={13} className="text-rose-500" aria-label="Frequently moderate or poor" />}
              </span>
            </Td>
            <Td className="mono-num">{r.assessments}</Td>
            <Td className="mono-num">{r.recordings}</Td>
            <Td>
              <EnvValue metric="temperature" value={r.avgTemperature} unit="°C" />
            </Td>
            <Td>
              <EnvValue metric="noise" value={r.avgNoise} unit="dBA" />
            </Td>
            <Td className="mono-num">
              {r.moderateCount + r.poorCount} of {r.assessments} ({Math.round(r.nonNormalShare * 100)}%)
            </Td>
            <Td>
              <Badge tone={statusToTone(r.status)}>{r.status}</Badge>
            </Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
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

      {classrooms.length > 0 && (
        <>
          <Card>
            <CardHeader
              title="Conditions by Classroom / Room Type"
              subtitle="Average of each classroom's assessments, coloured by Normal / Moderate / Poor range"
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Average Temperature (°C)</p>
                <MetricBarChart data={toBars(classrooms, 'temperature')} unit="°C" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Average Noise (dBA)</p>
                <MetricBarChart data={toBars(classrooms, 'noise')} unit="dBA" />
              </div>
            </div>
            <div className="mt-5">
              <SummaryTable title="Classroom / Room Type" rows={classrooms} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Classrooms with Frequent Moderate or Poor Conditions"
              subtitle={`Flagged when at least ${Math.round(FLAG_SHARE * 100)}% of a classroom's assessments were Moderate or Poor (minimum ${MIN_ASSESSMENTS_FOR_FLAG} assessments)`}
            />
            {flagged.length === 0 ? (
              <p className="text-sm text-slate-500">
                No classroom is currently flagged
                {classrooms.every((c) => c.assessments < MIN_ASSESSMENTS_FOR_FLAG)
                  ? ' — more assessments per classroom are needed for a reliable comparison.'
                  : '.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {flagged.map((c) => (
                  <li key={c.label} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium text-primary">
                      <AlertTriangle size={14} className="text-rose-500" />
                      {c.label}
                    </span>
                    <span className="text-xs text-slate-600">
                      {c.moderateCount} moderate · {c.poorCount} poor of {c.assessments} assessments (
                      {Math.round(c.nonNormalShare * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {schedules.length > 0 && (
        <Card>
          <CardHeader title="Conditions by Class Schedule" subtitle="Average of each schedule's assessments" />
          {schedules.length < 2 && (
            <p className="mb-3 text-xs text-slate-500">
              Only one schedule has data so far — add assessments from other schedules to compare them.
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Average Temperature (°C)</p>
              <MetricBarChart data={toBars(schedules, 'temperature')} unit="°C" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Average Noise (dBA)</p>
              <MetricBarChart data={toBars(schedules, 'noise')} unit="dBA" />
            </div>
          </div>
          <div className="mt-5">
            <SummaryTable title="Class Schedule" rows={schedules} />
          </div>
        </Card>
      )}

      {matrix.classrooms.length >= 1 && matrix.schedules.length >= 2 && (
        <Card>
          <CardHeader
            title="Classroom × Schedule"
            subtitle="Average temperature · noise (number of assessments) for each combination with data"
          />
          <TableShell scrollable={false}>
            <thead>
              <tr>
                <Th>Classroom / Room Type</Th>
                {matrix.schedules.map((s) => (
                  <Th key={s}>{s}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.classrooms.map((c) => (
                <tr key={c}>
                  <Td className="font-medium text-primary">{c}</Td>
                  {matrix.schedules.map((s) => {
                    const cell = matrix.cells.get(`${c}||${s}`);
                    return (
                      <Td key={s}>
                        {cell ? (
                          <span className="inline-flex items-center gap-2">
                            <Badge tone={statusToTone(cell.status)}>{cell.status}</Badge>
                            <span className="mono-num text-xs text-slate-600">
                              {cell.avgTemperature ?? '—'}°C · {cell.avgNoise ?? '—'} dBA ({cell.assessments})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
