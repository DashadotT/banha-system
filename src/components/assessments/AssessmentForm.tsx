import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { FormField, Input, Select } from '../common/FormField';
import { Button } from '../common/Button';
import { calculateScorePercentage } from '../../utils/calculations';
import { createAssessment } from '../../services/assessmentService';
import { fetchSettingOptions } from '../../services/settingsService';
import { useAsync } from '../../hooks/useAsync';
import { formatDate, toInputDate } from '../../utils/dateTime';
import type { GroupType } from '../../types';

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
  onSaved,
}: {
  recordingId: string;
  /** The recording's start (or end) date, used to auto-fill the assessment date. */
  recordingDate: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<DraftState>(() => loadDraft(recordingId));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subjectOptions } = useAsync(() => fetchSettingOptions('subject'));
  const { data: sectionOptions } = useAsync(() => fetchSettingOptions('section'));
  const { data: typeOptions } = useAsync(() => fetchSettingOptions('assessment_type'));

  // Persist the draft as the researcher types, so navigating away doesn't lose progress.
  useEffect(() => {
    saveDraft(recordingId, draft);
  }, [recordingId, draft]);

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
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save assessment details.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 size={28} className="text-emerald-500" />
        <p className="text-sm font-medium text-primary">Assessment details saved</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Add Assessment Details" subtitle="Link performance data to this recording" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Subject" required>
            <Select
              required
              value={draft.subject}
              onChange={(e) => update('subject', e.target.value)}
            >
              <option value="">Select subject…</option>
              {(subjectOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Section" required>
            <Select
              required
              value={draft.section}
              onChange={(e) => update('section', e.target.value)}
            >
              <option value="">Select section…</option>
              {(sectionOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
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
              {(typeOptions ?? []).map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Select>
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
            <Input type="text" readOnly disabled value={formatDate(recordingDate)} />
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

        <Button type="submit" loading={saving} disabled={saving} className="w-full sm:w-auto">
          Save Assessment Details
        </Button>
      </form>
    </Card>
  );
}
