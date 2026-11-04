import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/Modal';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentFieldsGrid, AssessmentStateBadge, ProgressBadge } from './AssessmentDetailsView';
import { setAssessmentPublished } from '../../services/assessmentService';
import { getAssessmentState } from '../../utils/assessment';
import type { Assessment, Recording } from '../../types';

/**
 * The one assessment-details interface, identical for Pending, Incomplete and
 * Completed assessments: same fields, with an Edit button to fill in or update.
 */
export function AssessmentDetailsSection({
  recording,
  assessment,
  members,
  showSession = true,
  embedded = false,
  onChanged,
  onNotice,
  onCancelNew,
}: {
  recording: Recording;
  assessment: Assessment | null;
  members: Recording[];
  showSession?: boolean;
  embedded?: boolean;
  onChanged: () => void;
  onNotice: (text: string) => void;
  onCancelNew?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = getAssessmentState(assessment, members);
  const groupName = recording.group?.name ?? null;
  const canPublish = Boolean(assessment) && (assessment?.show_in_assessments || state === 'completed');

  async function togglePublish() {
    if (!assessment || confirmPublish === null) return;
    setBusy(true);
    setError(null);
    try {
      await setAssessmentPublished(assessment.id, confirmPublish);
      onNotice(confirmPublish ? 'Added to the Assessments page.' : 'Removed from the Assessments page.');
      setConfirmPublish(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <AssessmentForm
          embedded
          recording={recording}
          assessment={assessment}
          members={members}
          showSession={showSession}
          onCancel={() => {
            setEditing(false);
            if (!assessment) onCancelNew?.();
          }}
          onSaved={() => {
            setEditing(false);
            onNotice('Assessment details saved.');
            onChanged();
          }}
          onReset={() => {
            setEditing(false);
            onNotice('Assessment details reset. The recording is back to Pending Assessment Details.');
            onChanged();
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardHeader
            title="Assessment Details"
            subtitle={groupName ? `Shared by all recordings in “${groupName}”` : 'Details of this recording’s assessment'}
          />
          <span className="-mt-4 flex items-center gap-2">
            <AssessmentStateBadge assessment={assessment} recordings={members} />
            {assessment && groupName && <ProgressBadge finalized={assessment.is_finalized} />}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {canPublish && (
            <Button variant="ghost" size="sm" onClick={() => { setError(null); setConfirmPublish(!assessment?.show_in_assessments); }}>
              {assessment?.show_in_assessments ? 'Remove from Assessments Page' : 'Add to Assessments Page'}
            </Button>
          )}
          <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      <AssessmentFieldsGrid assessment={assessment} recordings={showSession ? [recording] : members} groupName={groupName} date={recording.ended_at ?? recording.started_at} />
      {!assessment && (
        <p className="mt-4 text-xs text-slate-500">
          No assessment details yet. Click Edit to enter them{embedded ? '' : ' — nothing else is needed on this page'}.
        </p>
      )}

      <ConfirmDialog
        open={confirmPublish !== null}
        onClose={() => setConfirmPublish(null)}
        onConfirm={togglePublish}
        title={confirmPublish ? 'Add to Assessments page' : 'Remove from Assessments page'}
        confirmLabel={confirmPublish ? 'Add to Assessments' : 'Remove'}
        loading={busy}
        error={error}
      >
        {confirmPublish
          ? 'This assessment will be listed on the Assessments page and become available for Statistical Analysis. Nothing is duplicated — it stays linked to its recording(s).'
          : 'This assessment will no longer be listed on the Assessments page and will be excluded from Statistical Analysis. Its details and recording(s) are kept, and you can add it again any time.'}
      </ConfirmDialog>
    </Card>
  );
}
