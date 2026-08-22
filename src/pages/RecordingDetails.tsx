import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { RecordingStatusBadge } from '../components/recordings/RecordingStatusBadge';
import { TrendChart } from '../components/charts/TrendChart';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { AssessmentForm } from '../components/assessments/AssessmentForm';
import { useAsync } from '../hooks/useAsync';
import { fetchReadingsForRecording, fetchRecordingById } from '../services/recordingService';
import { fetchAssessmentByRecordingId } from '../services/assessmentService';
import { formatDateTime, formatDuration } from '../utils/dateTime';
import { mean, round } from '../utils/calculations';

export default function RecordingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: recording,
    loading: loadingRecording,
    error: recordingError,
  } = useAsync(() => fetchRecordingById(id as string), [id]);

  const { data: readings, loading: loadingReadings } = useAsync(
    () => fetchReadingsForRecording(id as string),
    [id]
  );

  const { data: assessment, loading: loadingAssessment } = useAsync(
    () => fetchAssessmentByRecordingId(id as string),
    [id, refreshKey]
  );

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
                  {recording.device?.device_name ?? 'Unknown device'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Recording ID: {recording.id}</p>
              </div>
              <RecordingStatusBadge status={recording.status} />
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
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {avgCo2 !== null ? `${avgCo2} ppm` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Average Temperature</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {avgTemp !== null ? `${avgTemp} °C` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Average Noise</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {avgNoise !== null ? `${avgNoise} dB` : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader title="CO₂ Trend" />
              {readings && readings.length > 0 ? (
                <TrendChart data={readings} metric="average_co2" color="#002858" unit="ppm" />
              ) : (
                <EmptyState title="No readings recorded" />
              )}
            </Card>
            <Card>
              <CardHeader title="Temperature Trend" />
              {readings && readings.length > 0 ? (
                <TrendChart data={readings} metric="average_temperature" color="#678EC4" unit="°C" />
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

          {assessment ? (
            <Card>
              <CardHeader title="Assessment Details" subtitle="Already recorded for this session" />
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
                  <dt className="text-xs text-slate-500">Score Percentage</dt>
                  <dd className="mono-num mt-0.5 text-sm font-semibold text-accent-700">
                    {assessment.score_percentage}%
                  </dd>
                </div>
              </dl>
            </Card>
          ) : (
            <AssessmentForm recordingId={recording.id} onSaved={() => setRefreshKey((k) => k + 1)} />
          )}
        </div>
      )}
    </AppLayout>
  );
}
