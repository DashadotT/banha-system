import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Eye, RotateCcw, Trash2, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/FormField';
import { Td, Th, TableShell } from '../components/common/Table';
import { Modal, PermanentDeleteConfirmDialog, RestoreConfirmDialog } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { RecordingSnapshot } from '../components/recordings/RecordingSnapshot';
import { AssessmentDetailsView } from '../components/assessments/AssessmentDetailsView';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  deleteRecordingPermanently,
  fetchArchivedRecordings,
  restoreRecording,
} from '../services/recordingService';
import {
  deleteAssessmentPermanently,
  fetchArchivedAssessments,
  fetchRecordingsForAssessment,
  restoreAssessment,
} from '../services/assessmentService';
import { assessmentLabel } from '../utils/assessment';
import { formatDateShort, formatDateTime } from '../utils/dateTime';
import type { Assessment, Recording } from '../types';

type TypeFilter = 'all' | 'original' | 'grouped' | 'assessment';

type ArchivedItem =
  | { kind: 'recording'; record: Recording }
  | { kind: 'assessment'; record: Assessment };

function itemLabel(item: ArchivedItem): string {
  return item.kind === 'recording'
    ? `recording ${item.record.id.slice(0, 8)}`
    : assessmentLabel(item.record);
}

function AssessmentArchiveView({ assessment }: { assessment: Assessment }) {
  const { data, loading } = useAsync(() => fetchRecordingsForAssessment(assessment), [assessment.id]);
  if (loading) return <LoadingState label="Loading recordings…" />;
  return <AssessmentDetailsView assessment={assessment} recordings={data ?? []} linkRecordings={false} />;
}

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

  const refetchAll = () => {
    refetchRecordings();
    refetchAssessments();
  };
  useRealtimeRefresh(['recordings', 'assessments'], refetchAll);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewTarget, setViewTarget] = useState<ArchivedItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ArchivedItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const items: ArchivedItem[] = useMemo(() => {
    const recordingItems: ArchivedItem[] = (archivedRecordings ?? []).map((r) => ({ kind: 'recording', record: r }));
    const assessmentItems: ArchivedItem[] = (archivedAssessments ?? []).map((a) => ({ kind: 'assessment', record: a }));
    return [...recordingItems, ...assessmentItems].sort(
      (a, b) => new Date(b.record.archived_at ?? 0).getTime() - new Date(a.record.archived_at ?? 0).getTime()
    );
  }, [archivedRecordings, archivedAssessments]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (typeFilter === 'all') return true;
        if (typeFilter === 'assessment') return item.kind === 'assessment';
        if (item.kind !== 'recording') return false;
        return typeFilter === 'original' ? !item.record.group_id : Boolean(item.record.group_id);
      }),
    [items, typeFilter]
  );

  const loading = loadingRecordings || loadingAssessments;
  const error = recordingsError || assessmentsError;

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setRestoring(true);
    setActionError(null);
    try {
      if (restoreTarget.kind === 'recording') await restoreRecording(restoreTarget.record.id);
      else await restoreAssessment(restoreTarget.record.id);
      setNotice(`Restored ${itemLabel(restoreTarget)}.`);
      setRestoreTarget(null);
      setViewTarget(null);
      refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not restore this record.');
    } finally {
      setRestoring(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      if (deleteTarget.kind === 'recording') await deleteRecordingPermanently(deleteTarget.record.id);
      else await deleteAssessmentPermanently(deleteTarget.record.id);
      setNotice(`Permanently deleted ${itemLabel(deleteTarget)}.`);
      setDeleteTarget(null);
      setViewTarget(null);
      refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete this record.');
    } finally {
      setDeleting(false);
    }
  }

  function openRestore(item: ArchivedItem) {
    setActionError(null);
    setRestoreTarget(item);
  }
  function openDelete(item: ArchivedItem) {
    setActionError(null);
    setDeleteTarget(item);
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

        <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
          <label htmlFor="archived-type-filter" className="text-xs font-medium text-slate-600">
            Show
          </label>
          <Select
            id="archived-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="w-auto"
          >
            <option value="all">All archived items</option>
            <option value="original">Original Data (individual recordings)</option>
            <option value="grouped">Grouped recordings</option>
            <option value="assessment">Assessments</option>
          </Select>
          {typeFilter !== 'all' && (
            <span className="text-xs text-slate-500">
              {visibleItems.length} of {items.length} shown
            </span>
          )}
        </div>

        {loading && <LoadingState label="Loading archived records…" />}
        {error && <ErrorState message={error} />}

        {!loading && !error && visibleItems.length === 0 && (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<Archive size={28} />}
              title={items.length === 0 ? 'No archived records' : 'No archived items match this filter'}
              description={
                items.length === 0
                  ? 'Recordings and assessments you archive will appear here for review, restoration, or permanent deletion.'
                  : 'Choose “All archived items” to see everything.'
              }
            />
          </div>
        )}
      </Card>

      {notice && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={15} />
            {notice}
          </span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {!loading && !error && visibleItems.length > 0 && (
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
              {visibleItems.map((item) => {
                const isRecording = item.kind === 'recording';
                const label = isRecording
                  ? `Recording ${item.record.id.slice(0, 8)}${item.record.group?.name ? ` (${item.record.group.name})` : ''}`
                  : assessmentLabel(item.record);
                const originalDate = isRecording ? item.record.started_at : item.record.assessment_date;
                return (
                  <tr key={`${item.kind}-${item.record.id}`} className="hover:bg-surface/60">
                    <Td>
                      <Badge tone={isRecording && !item.record.group_id ? 'accent' : 'neutral'}>
                        {!isRecording ? 'Assessment' : item.record.group_id ? 'Grouped Recording' : 'Original Recording'}
                      </Badge>
                    </Td>
                    <Td className="font-medium text-primary">{label}</Td>
                    <Td>{formatDateShort(originalDate)}</Td>
                    <Td>{formatDateTime(item.record.archived_at)}</Td>
                    <Td>
                      <Badge tone="archived">Archived</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewTarget(item)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary-50"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                        <button
                          onClick={() => openRestore(item)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                          Delete
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

      <Modal
        open={Boolean(viewTarget) && !restoreTarget && !deleteTarget}
        onClose={() => setViewTarget(null)}
        size="xl"
        title={viewTarget ? `Archived ${viewTarget.kind === 'recording' ? 'recording' : 'assessment'} — ${itemLabel(viewTarget)}` : ''}
        footer={
          viewTarget && (
            <>
              <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>
                Close
              </Button>
              <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={() => openRestore(viewTarget)}>
                Restore
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => openDelete(viewTarget)}>
                Delete Permanently
              </Button>
            </>
          )
        }
      >
        {viewTarget?.kind === 'recording' && <RecordingSnapshot recording={viewTarget.record} />}
        {viewTarget?.kind === 'assessment' && <AssessmentArchiveView assessment={viewTarget.record} />}
      </Modal>

      <RestoreConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestoreConfirm}
        itemLabel={restoreTarget ? itemLabel(restoreTarget) : ''}
        loading={restoring}
        error={actionError}
        description={
          restoreTarget?.kind === 'assessment'
            ? 'The assessment and the recording(s) archived with it return to the Assessments and Recordings pages.'
            : undefined
        }
      />

      <PermanentDeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemLabel={deleteTarget ? itemLabel(deleteTarget) : ''}
        loading={deleting}
        error={actionError}
        description={
          deleteTarget?.kind === 'assessment'
            ? 'Permanently deleting this assessment removes its assessment details only. Its recordings and sensor readings are not deleted and stay in Archived Records. This cannot be undone.'
            : 'Permanently deleting this recording removes it and all of its sensor readings. An assessment that belongs only to this recording is removed with it; a group’s shared assessment stays with the group’s other recordings. This cannot be undone.'
        }
      />
    </AppLayout>
  );
}
