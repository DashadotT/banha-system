import { useMemo, useState } from 'react';
import { Archive, Eye, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Td, Th, TableShell } from '../components/common/Table';
import { RestoreConfirmDialog } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import {
  fetchArchivedRecordings,
  restoreRecording,
} from '../services/recordingService';
import { fetchArchivedAssessments, restoreAssessment } from '../services/assessmentService';
import { formatDateShort, formatDateTime } from '../utils/dateTime';
import type { Assessment, Recording } from '../types';

type ArchivedItem =
  | { kind: 'recording'; record: Recording }
  | { kind: 'assessment'; record: Assessment };

export default function ArchivedRecords() {
  const {
    data: archivedRecordings,
    loading: loadingRecordings,
    error: recordingsError,
    refetch: refetchRecordings,
  } = useAsync(fetchArchivedRecordings);
  const {
    data: archivedAssessments,
    loading: loadingAssessments,
    error: assessmentsError,
    refetch: refetchAssessments,
  } = useAsync(fetchArchivedAssessments);

  const [restoreTarget, setRestoreTarget] = useState<ArchivedItem | null>(null);
  const [restoring, setRestoring] = useState(false);

  const items: ArchivedItem[] = useMemo(() => {
    const recordingItems: ArchivedItem[] = (archivedRecordings ?? []).map((r) => ({
      kind: 'recording',
      record: r,
    }));
    const assessmentItems: ArchivedItem[] = (archivedAssessments ?? []).map((a) => ({
      kind: 'assessment',
      record: a,
    }));
    return [...recordingItems, ...assessmentItems].sort((a, b) => {
      const dateA = a.kind === 'recording' ? a.record.archived_at : a.record.archived_at;
      const dateB = b.kind === 'recording' ? b.record.archived_at : b.record.archived_at;
      return new Date(dateB ?? 0).getTime() - new Date(dateA ?? 0).getTime();
    });
  }, [archivedRecordings, archivedAssessments]);

  const loading = loadingRecordings || loadingAssessments;
  const error = recordingsError || assessmentsError;

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      if (restoreTarget.kind === 'recording') {
        await restoreRecording(restoreTarget.record.id);
        refetchRecordings();
      } else {
        await restoreAssessment(restoreTarget.record.id);
        refetchAssessments();
      }
      setRestoreTarget(null);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <AppLayout title="Archived Records">
      <Card padding={false} className="overflow-visible">
        <div className="p-5 pb-0">
          <CardHeader
            title="Archived Recordings & Assessments"
            subtitle="Excluded from active views, reports, and statistical analysis"
          />
        </div>

        {loading && <LoadingState label="Loading archived records…" />}
        {error && <ErrorState message={error} />}

        {!loading && !error && items.length === 0 && (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<Archive size={28} />}
              title="No archived records"
              description="Recordings and assessments you archive will appear here for review or restoration."
            />
          </div>
        )}
      </Card>

      {!loading && !error && items.length > 0 && (
        <div className="mt-5">
          <TableShell>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Name / Identifier</Th>
                <Th>Original Date</Th>
                <Th>Archived Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isRecording = item.kind === 'recording';
                const label = isRecording
                  ? `${item.record.device?.device_name ?? '—'} — ${item.record.id.slice(0, 8)}`
                  : `${item.record.assessment_type} #${item.record.assessment_number} (${item.record.subject})`;
                const originalDate = isRecording
                  ? item.record.started_at
                  : item.record.assessment_date;
                const detailsLink = isRecording
                  ? `/recordings/${item.record.id}`
                  : `/recordings/${item.record.recording_id}`;
                return (
                  <tr key={`${item.kind}-${item.record.id}`} className="hover:bg-surface/60">
                    <Td>
                      <Badge tone="neutral">{isRecording ? 'Recording' : 'Assessment'}</Badge>
                    </Td>
                    <Td className="font-medium text-primary">{label}</Td>
                    <Td>{formatDateShort(originalDate)}</Td>
                    <Td>{formatDateTime(item.record.archived_at)}</Td>
                    <Td>
                      <Badge tone="archived">Archived</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={detailsLink}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-50"
                        >
                          <Eye size={14} />
                          View Details
                        </Link>
                        <button
                          onClick={() => setRestoreTarget(item)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </div>
      )}

      <RestoreConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestoreConfirm}
        itemLabel={
          restoreTarget
            ? restoreTarget.kind === 'recording'
              ? `recording ${restoreTarget.record.id.slice(0, 8)}`
              : `${restoreTarget.record.assessment_type} #${restoreTarget.record.assessment_number}`
            : ''
        }
        loading={restoring}
      />
    </AppLayout>
  );
}
