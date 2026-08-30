import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { RecordingStatusBadge } from '../components/recordings/RecordingStatusBadge';
import { TrendChart } from '../components/charts/TrendChart';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { EnvValue } from '../components/common/EnvValue';
import { EnvironmentalStatusInfo } from '../components/common/EnvironmentalStatusInfo';
import { AssessmentForm } from '../components/assessments/AssessmentForm';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { fetchReadingsForRecording, fetchRecordingById } from '../services/recordingService';
import { fetchAssessmentByRecordingId } from '../services/assessmentService';
import { formatDateTime, formatDuration } from '../utils/dateTime';
import { mean, round } from '../utils/calculations';

export default function RecordingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);

  const {
    data: recording,
    loading: loadingRecording,
    error: recordingError,
  } = useAsync(() => fetchRecordingById(id as string), [id]);

  const { data: readings, loading: loadingReadings, refetch: refetchReadings } = useAsync(
    () => fetchReadingsForRecording(id as string),
    [id]
  );

  const { data: assessment, loading: loadingAssessment } = useAsync(
    () => fetchAssessmentByRecordingId(id as string),
    [id, refreshKey]
  );

  useRealtimeRefresh(['environmental_readings'], refetchReadings);

  const loading = loadingRecording || loadingReadings || loadingAssessment;

  const avgCo2 = readings?.length ? round(mean(readings.map((r) => r.average_co2)), 1) : null;
  const avgTemp = readings?.length
    ? round(mean(readings.map((r) => r.average_temperature)), 1)
    : null;
  const avgNoise = readings?.length ? round(mean(readings.map((r) => r.average_noise)), 1) : null;

  return (
    <AppLayout title="Recording Details">
      <button
        onClick={() => navigate('/recordings')}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-secondary-700 hover:text-primary"
      >
        <ArrowLeft size={15} />
        Back to Recordings
      </button>

      {loading && <LoadingState label="Loading recording details…" />}
      {recordingError && <ErrorState message={recordingError} />}

      {!loading && !recordingError && !recording && (
        <EmptyState title="Recording not found" description="This recording may have been archived or removed." />
      )}

      {recording && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {recording.device?.device_name ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Recording ID: {recording.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <EnvironmentalStatusInfo compact />
                <RecordingStatusBadge status={recording.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Start</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">
                  {formatDateTime(recording.started_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">End</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">
                  {recording.ended_at ? formatDateTime(recording.ended_at) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Duration</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {formatDuration(recording.duration_seconds)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Data Packets</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {readings?.length ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Average CO₂</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">
                  <EnvValue metric="co2" value={avgCo2} unit="ppm" decimals={0} />
                </dd>
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
                  <EnvValue metric="noise" value={avgNoise} unit="dB" />
                </dd>
              </div>
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader title="Temperature Trend" />
              {readings && readings.length > 0 ? (
                <TrendChart data={readings} metric="average_temperature" color="#678EC4" unit="°C" />
              ) : (
                <EmptyState title="No readings recorded" />
              )}
            </Card>
            <Card>
              <CardHeader title="CO₂ Trend" />
              {readings && readings.length > 0 ? (
                <TrendChart data={readings} metric="average_co2" color="#002858" unit="ppm" />
              ) : (
                <EmptyState title="No readings recorded" />
              )}
            </Card>
            <Card>
              <CardHeader title="Noise Trend" />
              {readings && readings.length > 0 ? (
                <TrendChart data={readings} metric="average_noise" color="#DEAE20" unit="dB" />
              ) : (
                <EmptyState title="No readings recorded" />
              )}
            </Card>
          </div>

          {assessment && !assessment.is_archived && !isEditingAssessment && (
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <CardHeader title="Assessment Details" subtitle="Already recorded for this session" />
                <button
                  onClick={() => setIsEditingAssessment(true)}
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Subject</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Section</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.section}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Group</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.group_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Assessment Type</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">
                    {assessment.assessment_type} #{assessment.assessment_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Score Percentage</dt>
                  <dd className="mono-num mt-0.5 text-sm font-semibold text-accent-700">
                    {assessment.score_percentage}%
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {assessment && !assessment.is_archived && isEditingAssessment && (
            <AssessmentForm
              recordingId={recording.id}
              recordingDate={recording.ended_at ?? recording.started_at}
              existingAssessment={assessment}
              onSaved={() => {
                setIsEditingAssessment(false);
                setRefreshKey((k) => k + 1);
              }}
              onCancel={() => setIsEditingAssessment(false)}
            />
          )}

          {assessment && assessment.is_archived && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardHeader title="Assessment Details" subtitle="This assessment has been archived" />
                <span className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                  Archived
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Subject</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Section</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.section}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Group</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">{assessment.group_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Assessment Type</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary">
                    {assessment.assessment_type} #{assessment.assessment_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Score Percentage</dt>
                  <dd className="mono-num mt-0.5 text-sm font-semibold text-accent-700">
                    {assessment.score_percentage}%
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {(!assessment || assessment.is_archived) && !recording.is_archived && !isEditingAssessment && (
            <AssessmentForm
              recordingId={recording.id}
              recordingDate={recording.ended_at ?? recording.started_at}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          )}
        </div>
      )}
    </AppLayout>
  );
}
