import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, Layers, StickyNote, Unlink } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/Modal';
import { RecordingNoteModal } from './RecordingNoteModal';
import { GroupCombinedCard } from './GroupCombinedCard';
import { TrendChart } from '../charts/TrendChart';
import { EmptyState, ErrorState, LoadingState } from '../common/States';
import { EnvValue } from '../common/EnvValue';
import { EnvironmentalStatusInfo } from '../common/EnvironmentalStatusInfo';
import { AssessmentDetailsSection } from '../assessments/AssessmentDetailsSection';
import { ProgressBadge } from '../assessments/AssessmentDetailsView';
import { useAsync } from '../../hooks/useAsync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import {
  fetchReadingsForRecording,
  fetchReadingsForRecordings,
  fetchRecordingById,
  fetchRecordingsInGroup,
  ungroupRecording,
} from '../../services/recordingService';
import { fetchAssessmentForRecording } from '../../services/assessmentService';
import { exportRecordingReadingsCsv } from '../../services/exportService';
import { formatDateTime, formatDuration } from '../../utils/dateTime';
import { getAssessmentState, STATE_TO_STATUS } from '../../utils/assessment';
import { RecordingStatusBadge } from './RecordingStatusBadge';
import { max, mean, min, round } from '../../utils/calculations';

/**
 * Full view/edit of ONE recording. Used both as a page body and inside the
 * Recordings page modal. For a grouped recording the assessment group is
 * shown first, and individual sessions stay reachable from its list.
 */
export function RecordingDetailsPanel({
  recordingId: id,
  embedded = false,
  onChanged,
  onOpenRecording,
  onOpenGroup,
}: {
  recordingId: string;
  embedded?: boolean;
  onClose?: () => void; // kept for callers; the modal footer closes it
  onChanged?: () => void;
  onOpenRecording?: (id: string) => void;
  onOpenGroup?: (groupId: string) => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [confirmUngroup, setConfirmUngroup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: recording, loading: loadingRecording, error: recordingError } = useAsync(
    () => fetchRecordingById(id),
    [id, refreshKey]
  );
  const groupId = recording?.group_id ?? null;

  const { data: readings, loading: loadingReadings, refetch: refetchReadings } = useAsync(
    () => fetchReadingsForRecording(id),
    [id]
  );
  const { data: assessment } = useAsync(() => fetchAssessmentForRecording(id, groupId), [id, refreshKey, groupId]);
  const { data: members } = useAsync(
    () => (groupId ? fetchRecordingsInGroup(groupId) : Promise.resolve([])),
    [groupId, refreshKey]
  );
  const activeMembers = (members ?? []).filter((m) => !m.is_archived);
  const { data: groupReadings } = useAsync(
    () => (groupId ? fetchReadingsForRecordings(activeMembers.map((m) => m.id)) : Promise.resolve([])),
    [groupId, activeMembers.map((m) => m.id).join(','), refreshKey]
  );

  useRealtimeRefresh(['environmental_readings'], refetchReadings);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    onChanged?.();
  };

  const avgTemp = readings?.length ? round(mean(readings.map((r) => r.average_temperature)), 1) : null;
  const avgNoise = readings?.length ? round(mean(readings.map((r) => r.average_noise)), 1) : null;
  const peakTemp = readings?.length ? max(readings.map((r) => r.average_temperature)) : null;
  const lowestTemp = readings?.length ? min(readings.map((r) => r.average_temperature)) : null;
  const peakNoise = readings?.length ? max(readings.map((r) => r.average_noise)) : null;
  const lowestNoise = readings?.length ? min(readings.map((r) => r.average_noise)) : null;

  const unitMembers = recording ? (groupId ? activeMembers : [recording]) : [];
  const activeAssessment = assessment && !assessment.is_archived ? assessment : null;
  const state = getAssessmentState(activeAssessment, unitMembers);

  async function handleUngroup() {
    if (!recording) return;
    setBusy(true);
    setActionError(null);
    try {
      await ungroupRecording(recording.id);
      setConfirmUngroup(false);
      setNotice('Recording removed from the assessment group.');
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const loading = loadingRecording || loadingReadings;

  return (
    <div>
      {loading && !recording && <LoadingState label="Loading recording details…" />}
      {recordingError && <ErrorState message={recordingError} />}
      {!loading && !recordingError && !recording && (
        <EmptyState title="Recording not found" description="This recording may have been removed." />
      )}

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={15} />
          {notice}
        </div>
      )}

      {recording && (
        <div className="space-y-6">
          {recording.group && (
            <Card className="border-accent-200 bg-accent-50/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Layers size={16} className="text-accent-700" />
                  <span className="text-sm font-semibold text-primary">Assessment group: {recording.group.name}</span>
                  {activeAssessment && <ProgressBadge finalized={activeAssessment.is_finalized} />}
                  <span className="text-xs text-slate-500">
                    This is one of {activeMembers.length} recording{activeMembers.length === 1 ? '' : 's'} in the group.
                  </span>
                </div>
                {onOpenGroup ? (
                  <Button size="sm" variant="outline" onClick={() => onOpenGroup(recording.group_id as string)}>
                    Open assessment group
                  </Button>
                ) : (
                  <Link to="/recordings" className="text-xs font-medium text-secondary-700 hover:underline">
                    Manage in Recordings
                  </Link>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{formatDateTime(recording.started_at)}</p>
                <p className="mt-0.5 text-xs text-slate-500">Recording ID: {recording.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EnvironmentalStatusInfo compact />
                {recording.is_archived ? (
                  <Badge tone="archived">Archived</Badge>
                ) : (
                  <RecordingStatusBadge status={recording.status === 'recording' ? 'recording' : STATE_TO_STATUS[state]} />
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button size="sm" variant="outline" icon={<Download size={14} />}
                disabled={!readings || readings.length === 0}
                onClick={() => readings && exportRecordingReadingsCsv(recording, readings)}>
                Export Sensor Data (CSV)
              </Button>
              <Button size="sm" variant="outline" icon={<StickyNote size={14} />} onClick={() => setNoteOpen(true)}>
                {recording.notes ? 'Edit Note' : 'Add Note'}
              </Button>
              {recording.group && (
                <Button size="sm" variant="outline" icon={<Unlink size={14} />} onClick={() => { setActionError(null); setConfirmUngroup(true); }}>
                  Remove from Group
                </Button>
              )}
            </div>
          </Card>

          {recording.notes && (
            <Card>
              <CardHeader title="Note" />
              <p className="whitespace-pre-wrap text-sm text-slate-700">{recording.notes}</p>
            </Card>
          )}

          {recording.group && activeMembers.length > 0 && (
            <GroupCombinedCard
              members={activeMembers}
              readings={groupReadings ?? []}
              highlightId={recording.id}
              onOpenRecording={onOpenRecording}
            />
          )}

          {!recording.is_archived && recording.status !== 'recording' && (
            <AssessmentDetailsSection
              recording={recording}
              assessment={activeAssessment}
              members={unitMembers}
              embedded={embedded}
              onChanged={refresh}
              onNotice={setNotice}
            />
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                <TrendChart data={readings} metric="average_noise" color="#DEAE20" unit="dBA" />
              ) : (
                <EmptyState title="No readings recorded" />
              )}
            </Card>
          </div>

          {readings && readings.length > 0 && (
            <Card>
              <CardHeader title="Peaks for This Session" subtitle="Highest and lowest 1-minute averages recorded" />
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Highest Temperature</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary"><EnvValue metric="temperature" value={peakTemp} unit="°C" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lowest Temperature</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary"><EnvValue metric="temperature" value={lowestTemp} unit="°C" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Highest Noise</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary"><EnvValue metric="noise" value={peakNoise} unit="dBA" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Lowest Noise</dt>
                  <dd className="mt-0.5 text-sm font-medium text-primary"><EnvValue metric="noise" value={lowestNoise} unit="dBA" /></dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      )}

      <RecordingNoteModal
        recording={noteOpen ? recording ?? null : null}
        onClose={() => setNoteOpen(false)}
        onSaved={() => {
          setNotice('Note saved.');
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirmUngroup}
        onClose={() => setConfirmUngroup(false)}
        title="Remove from assessment group"
        confirmLabel="Remove from group"
        loading={busy}
        error={actionError}
        onConfirm={handleUngroup}
      >
        Remove this recording from “{recording?.group?.name}”? Its sensor data, dates, classroom and schedule are not
        changed. It will no longer share the group’s assessment details
        {activeMembers.length <= 1 ? ' — as the last recording, it keeps the group’s details on its own.' : '.'}
      </ConfirmDialog>
    </div>
  );
}
