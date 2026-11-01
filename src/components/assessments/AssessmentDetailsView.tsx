import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Badge } from '../common/Badge';
import { EnvValue } from '../common/EnvValue';
import { Td, Th, TableShell } from '../common/Table';
import { RecordingStatusBadge } from '../recordings/RecordingStatusBadge';
import { formatDate, formatDateShort, formatDuration, formatTime } from '../../utils/dateTime';
import { getAssessmentState, STATE_TO_STATUS, distinctValues } from '../../utils/assessment';
import type { EnvStats } from '../../services/analysisService';
import type { Assessment, Recording } from '../../types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value || <span className="text-slate-400">Not provided</span>}</dd>
    </div>
  );
}

export function ProgressBadge({ finalized }: { finalized: boolean }) {
  return finalized ? (
    <Badge tone="normal" dot>Completed</Badge>
  ) : (
    <Badge tone="moderate" dot>Ongoing</Badge>
  );
}

/** Publication status only (never completion): ✓ Ready / ✗ Not Added. */
export function PublicationMark({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700" title="Added to the Assessments page">
      <Check size={15} strokeWidth={3} /> Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500" title="Not added to the Assessments page">
      <X size={15} strokeWidth={3} className="text-rose-500" /> Not Added
    </span>
  );
}

export function AssessmentStateBadge({ assessment, recordings }: { assessment: Assessment | null; recordings: Recording[] }) {
  return <RecordingStatusBadge status={STATE_TO_STATUS[getAssessmentState(assessment, recordings)]} />;
}

/** The assessment fields as a read-only grid; empty fields read "Not provided". */
export function AssessmentFieldsGrid({
  assessment,
  recordings,
  date,
  groupName,
}: {
  assessment: Assessment | null;
  /** Recordings whose classroom / schedule are shown (all of a group's, or the one recording). */
  recordings: Recording[];
  date?: string;
  groupName?: string | null;
}) {
  const a = assessment;
  const classrooms = distinctValues(recordings.map((r) => r.classroom_type));
  const schedules = distinctValues(recordings.map((r) => r.class_schedule));
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Field label="Subject" value={a?.subject} />
      <Field label="Section" value={a?.section} />
      <Field label="Group" value={a?.group_type} />
      <Field label="Assessment Type" value={a?.assessment_type} />
      <Field label="Assessment Number" value={a?.assessment_number != null ? String(a.assessment_number) : ''} />
      <Field label="Assessment Date" value={a?.assessment_date || date ? formatDate(a?.assessment_date ?? (date as string)) : ''} />
      <Field label="Classroom / Room Type" value={classrooms.join(', ')} />
      <Field label="Class Schedule" value={schedules.join(', ')} />
      <Field label="Assessment Group" value={groupName} />
      <Field label="Assessment Progress" value={a ? <ProgressBadge finalized={a.is_finalized} /> : ''} />
      <Field label="Assessments Page" value={a ? <PublicationMark published={a.show_in_assessments} /> : ''} />
      <Field label="Final Class Average" value={a?.class_average_score != null ? String(a.class_average_score) : ''} />
      <Field label="Total Possible Score" value={a?.total_possible_score != null ? String(a.total_possible_score) : ''} />
      <Field
        label="Final Score Percentage"
        value={a?.score_percentage != null ? <span className="mono-num font-semibold text-accent-700">{a.score_percentage}%</span> : ''}
      />
    </dl>
  );
}

/** Assessment fields plus the recordings that belong to it. */
export function AssessmentDetailsView({
  assessment,
  recordings,
  recordingStats,
  linkRecordings = true,
}: {
  assessment: Assessment;
  recordings: Recording[];
  recordingStats?: (EnvStats & { recording: Recording })[];
  linkRecordings?: boolean;
}) {
  const statsFor = (id: string) => recordingStats?.find((s) => s.recording.id === id);
  const state = getAssessmentState(assessment, recordings);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <RecordingStatusBadge status={STATE_TO_STATUS[state]} />
        <ProgressBadge finalized={assessment.is_finalized} />
        {assessment.is_archived && <Badge tone="archived">Archived</Badge>}
        {assessment.group?.name && <Badge tone="accent">Group: {assessment.group.name}</Badge>}
      </div>

      <AssessmentFieldsGrid assessment={assessment} recordings={recordings} groupName={assessment.group?.name} />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Associated recordings ({recordings.length})
        </p>
        {recordings.length === 0 ? (
          <p className="text-sm text-slate-400">No recordings are linked to this assessment.</p>
        ) : (
          <TableShell scrollable={false}>
            <thead>
              <tr>
                <Th>Recording</Th>
                <Th>Date</Th>
                <Th>Start – End</Th>
                <Th>Classroom</Th>
                <Th>Schedule</Th>
                {recordingStats && <Th>Avg Temp</Th>}
                {recordingStats && <Th>Avg Noise</Th>}
                <Th>Duration</Th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => {
                const st = statsFor(r.id);
                return (
                  <tr key={r.id}>
                    <Td className="font-mono text-xs">
                      {linkRecordings && !r.is_archived ? (
                        <Link to={`/recordings/${r.id}`} className="text-secondary-700 hover:underline">
                          {r.id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{r.id.slice(0, 8)}</span>
                      )}
                    </Td>
                    <Td>{formatDateShort(r.started_at)}</Td>
                    <Td>
                      {formatTime(r.started_at)} – {r.ended_at ? formatTime(r.ended_at) : '—'}
                    </Td>
                    <Td>{r.classroom_type ?? <span className="text-slate-300">—</span>}</Td>
                    <Td>{r.class_schedule ?? <span className="text-slate-300">—</span>}</Td>
                    {recordingStats && (
                      <Td>
                        <EnvValue metric="temperature" value={st?.avgTemperature ?? null} unit="°C" />
                      </Td>
                    )}
                    {recordingStats && (
                      <Td>
                        <EnvValue metric="noise" value={st?.avgNoise ?? null} unit="dBA" />
                      </Td>
                    )}
                    <Td className="mono-num">{formatDuration(r.duration_seconds)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
