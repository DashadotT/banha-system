import { Badge } from '../common/Badge';
import { EnvValue } from '../common/EnvValue';
import { LoadingState } from '../common/States';
import { TrendChart } from '../charts/TrendChart';
import { AssessmentFieldsGrid } from '../assessments/AssessmentDetailsView';
import { useAsync } from '../../hooks/useAsync';
import { fetchReadingsForRecording } from '../../services/recordingService';
import { fetchAssessmentForRecording } from '../../services/assessmentService';
import { formatDateTime, formatDuration } from '../../utils/dateTime';
import { mean, round } from '../../utils/calculations';
import type { Recording } from '../../types';

/** Read-only view of a recording (original data + assessment details) for modals. */
export function RecordingSnapshot({ recording }: { recording: Recording }) {
  const { data: readings, loading } = useAsync(() => fetchReadingsForRecording(recording.id), [recording.id]);
  const { data: assessment, loading: loadingAssessment } = useAsync(
    () => fetchAssessmentForRecording(recording.id, recording.group_id),
    [recording.id, recording.group_id]
  );

  const avgTemp = readings?.length ? round(mean(readings.map((r) => r.average_temperature)), 1) : null;
  const avgNoise = readings?.length ? round(mean(readings.map((r) => r.average_noise)), 1) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="archived">Archived</Badge>
        {recording.group?.name && <Badge tone="accent">Group: {recording.group.name}</Badge>}
        <span className="font-mono text-xs text-slate-500">{recording.id}</span>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Start</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">{formatDateTime(recording.started_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">End</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">
            {recording.ended_at ? formatDateTime(recording.ended_at) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Duration</dt>
          <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{formatDuration(recording.duration_seconds)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Data Packets</dt>
          <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{readings?.length ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Average Temperature</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">
            <EnvValue metric="temperature" value={avgTemp} unit="°C" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Average Noise</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">
            <EnvValue metric="noise" value={avgNoise} unit="dBA" />
          </dd>
        </div>
      </dl>

      {recording.notes && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Note</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{recording.notes}</p>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading readings…" />
      ) : readings && readings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Temperature Trend</p>
            <TrendChart data={readings} metric="average_temperature" color="#678EC4" unit="°C" height={180} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Noise Trend</p>
            <TrendChart data={readings} metric="average_noise" color="#DEAE20" unit="dBA" height={180} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">No sensor readings were recorded.</p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment Details</p>
        {loadingAssessment ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : assessment ? (
          <AssessmentFieldsGrid assessment={assessment} recordings={[recording]} groupName={recording.group?.name} />
        ) : (
          <p className="text-sm text-slate-400">No assessment details were saved for this recording.</p>
        )}
      </div>
    </div>
  );
}
