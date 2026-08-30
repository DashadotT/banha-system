import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { FormField, Input, Select } from '../common/FormField';
import { Button } from '../common/Button';
import { calculateScorePercentage } from '../../utils/calculations';
import { createAssessment, updateAssessment } from '../../services/assessmentService';
import { fetchSettingOptions } from '../../services/settingsService';
import { useAsync } from '../../hooks/useAsync';
import { formatDate, toInputDate } from '../../utils/dateTime';
import type { Assessment, GroupType } from '../../types';

const GROUP_TYPES: GroupType[] = ['Experimental', 'Comparison'];

interface DraftState {
  subject: string;
  section: string;
  groupType: GroupType;
  assessmentType: string;
  assessmentNumber: string;
  classAverageScore: string;
  totalPossibleScore: string;
}

const EMPTY_DRAFT: DraftState = {
  subject: '',
  section: '',
  groupType: 'Experimental',
  assessmentType: '',
  assessmentNumber: '',
  classAverageScore: '',
  totalPossibleScore: '',
};

function draftFromAssessment(assessment: Assessment): DraftState {
  return {
    subject: assessment.subject,
    section: assessment.section,
    groupType: assessment.group_type,
    assessmentType: assessment.assessment_type,
    assessmentNumber: String(assessment.assessment_number),
    classAverageScore: String(assessment.class_average_score),
    totalPossibleScore: String(assessment.total_possible_score),
  };
}

function draftKey(recordingId: string) {
  return `banha:assessment-draft:${recordingId}`;
}

function loadDraft(recordingId: string): DraftState {
  try {
    const raw = window.localStorage.getItem(draftKey(recordingId));
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function saveDraft(recordingId: string, draft: DraftState) {
  try {
    window.localStorage.setItem(draftKey(recordingId), JSON.stringify(draft));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

function clearDraft(recordingId: string) {
  try {
    window.localStorage.removeItem(draftKey(recordingId));
  } catch {
    // ignore
  }
}

export function AssessmentForm({
  recordingId,
  recordingDate,
  existingAssessment,
  onSaved,
  onCancel,
}: {
  recordingId: string;
  /** The recording's start (or end) date, used to auto-fill the assessment date. */
  recordingDate: string;
  /** When provided, the form edits this assessment instead of creating a new one. */
  existingAssessment?: Assessment;
  onSaved: () => void;
  /** Shown only in edit mode, to back out without saving changes. */
  onCancel?: () => void;
}) {
  const isEditing = Boolean(existingAssessment);

  const [draft, setDraft] = useState<DraftState>(() =>
    existingAssessment ? draftFromAssessment(existingAssessment) : loadDraft(recordingId)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: subjectOptions,
    loading: loadingSubjects,
    refetch: refetchSubjects,
  } = useAsync(() => fetchSettingOptions('subject'));
  const {
    data: sectionOptions,
    loading: loadingSections,
    refetch: refetchSections,
  } = useAsync(() => fetchSettingOptions('section'));
  const {
    data: typeOptions,
    loading: loadingTypes,
    refetch: refetchTypes,
  } = useAsync(() => fetchSettingOptions('assessment_type'));

  // Persist the draft as the researcher types (create mode only), so
  // navigating away doesn't lose progress.
  useEffect(() => {
    if (!isEditing) saveDraft(recordingId, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId, draft, isEditing]);

  const assessmentDate = toInputDate(recordingDate);
  const avg = parseFloat(draft.classAverageScore);
  const total = parseFloat(draft.totalPossibleScore);
  const percentage =
    !Number.isNaN(avg) && !Number.isNaN(total) && total > 0
      ? calculateScorePercentage(avg, total)
      : null;

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function refreshAllOptions() {
    refetchSubjects();
    refetchSections();
    refetchTypes();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Guard against duplicate submissions from rapid repeat clicks.
    if (saving) return;

    const assessmentNumber = parseInt(draft.assessmentNumber, 10);
    if (Number.isNaN(avg) || Number.isNaN(total) || total <= 0) {
      setError('Enter valid numeric scores. Total possible score must be greater than zero.');
      return;
    }
    if (Number.isNaN(assessmentNumber) || assessmentNumber < 1) {
      setError('Assessment Number must be 1 or higher.');
      return;
    }
    if (!draft.subject || !draft.section || !draft.assessmentType) {
      setError('Select a subject, section, and assessment type.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && existingAssessment) {
        await updateAssessment(existingAssessment.id, {
          subject: draft.subject,
          section: draft.section,
          group_type: draft.groupType,
          assessment_type: draft.assessmentType,
          assessment_number: assessmentNumber,
          assessment_date: existingAssessment.assessment_date,
          class_average_score: avg,
          total_possible_score: total,
        });
      } else {
        await createAssessment({
          recording_id: recordingId,
          subject: draft.subject,
          section: draft.section,
          group_type: draft.groupType,
          assessment_type: draft.assessmentType,
          assessment_number: assessmentNumber,
          assessment_date: assessmentDate,
          class_average_score: avg,
          total_possible_score: total,
        });
        clearDraft(recordingId);
      }
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save assessment details.');
    } finally {
      setSaving(false);
    }
  }

  if (saved && !isEditing) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 size={28} className="text-emerald-500" />
        <p className="text-sm font-medium text-primary">Assessment details saved</p>
      </Card>
    );
  }

  const optionsLoading = loadingSubjects || loadingSections || loadingTypes;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <CardHeader
          title={isEditing ? 'Edit Assessment Details' : 'Add Assessment Details'}
          subtitle="Link performance data to this recording"
        />
        <button
          type="button"
          onClick={refreshAllOptions}
          disabled={optionsLoading}
          className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          title="Refresh Subject / Section / Type options"
        >
          <RefreshCw size={13} className={optionsLoading ? 'animate-spin' : ''} />
          Refresh options
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Subject" required>
            <Select
              required
              value={draft.subject}
              onChange={(e) => update('subject', e.target.value)}
            >
              <option value="">Select subject…</option>
              {draft.subject && !(subjectOptions ?? []).some((o) => o.value === draft.subject) && (
                <option value={draft.subject}>{draft.subject} (archived)</option>
              )}
              {(subjectOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
            {(subjectOptions ?? []).length === 0 && !loadingSubjects && (
              <p className="mt-1 text-xs text-amber-600">
                No subjects configured yet — add some in System Settings.
              </p>
            )}
          </FormField>
          <FormField label="Section" required>
            <Select
              required
              value={draft.section}
              onChange={(e) => update('section', e.target.value)}
            >
              <option value="">Select section…</option>
              {draft.section && !(sectionOptions ?? []).some((o) => o.value === draft.section) && (
                <option value={draft.section}>{draft.section} (archived)</option>
              )}
              {(sectionOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
            {(sectionOptions ?? []).length === 0 && !loadingSections && (
              <p className="mt-1 text-xs text-amber-600">
                No sections configured yet — add some in System Settings.
              </p>
            )}
          </FormField>
          <FormField label="Group" required>
            <Select value={draft.groupType} onChange={(e) => update('groupType', e.target.value as GroupType)}>
              {GROUP_TYPES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment Type" required>
            <Select
              required
              value={draft.assessmentType}
              onChange={(e) => update('assessmentType', e.target.value)}
            >
              <option value="">Select type…</option>
              {draft.assessmentType &&
                !(typeOptions ?? []).some((o) => o.value === draft.assessmentType) && (
                  <option value={draft.assessmentType}>{draft.assessmentType} (archived)</option>
                )}
              {(typeOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
            {(typeOptions ?? []).length === 0 && !loadingTypes && (
              <p className="mt-1 text-xs text-amber-600">
                No assessment types configured yet — add some in System Settings.
              </p>
            )}
          </FormField>
          <FormField label="Assessment Number" required hint="e.g. 1 for Quiz 1, 2 for Quiz 2">
            <Input
              type="number"
              min={1}
              step={1}
              required
              value={draft.assessmentNumber}
              onChange={(e) => update('assessmentNumber', e.target.value)}
              placeholder="1"
            />
          </FormField>
          <FormField label="Assessment Date" hint="Automatically set from the recording date">
            <Input
              type="text"
              readOnly
              disabled
              value={formatDate(isEditing ? existingAssessment!.assessment_date : recordingDate)}
            />
          </FormField>
          <FormField label="Class Average Score" required>
            <Input
              type="number"
              step="0.01"
              required
              value={draft.classAverageScore}
              onChange={(e) => update('classAverageScore', e.target.value)}
              placeholder="e.g. 12"
            />
          </FormField>
          <FormField label="Total Possible Score" required>
            <Input
              type="number"
              step="0.01"
              required
              value={draft.totalPossibleScore}
              onChange={(e) => update('totalPossibleScore', e.target.value)}
              placeholder="e.g. 15"
            />
          </FormField>
        </div>

        <div className="rounded-md bg-surface px-4 py-3">
          <p className="text-xs text-slate-500">Score Percentage (auto-calculated)</p>
          <p className="mono-num mt-1 text-xl font-bold text-primary">
            {percentage !== null ? `${percentage}%` : '—'}
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={saving} disabled={saving}>
            {isEditing ? 'Save Changes' : 'Save Assessment Details'}
          </Button>
          {isEditing && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
