import { useState } from 'react';
import type { FormEvent } from 'react';
import { Card, CardHeader } from '../common/Card';
import { FormField, Input, Select } from '../common/FormField';
import { Button } from '../common/Button';
import { calculateScorePercentage } from '../../utils/calculations';
import { createAssessment } from '../../services/assessmentService';
import type { AssessmentType, GroupType } from '../../types';

const ASSESSMENT_TYPES: AssessmentType[] = ['Quiz', 'Examination', 'Activity', 'Exercise'];
const GROUP_TYPES: GroupType[] = ['Experimental', 'Comparison'];

export function AssessmentForm({
  recordingId,
  onSaved,
}: {
  recordingId: string;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('Experimental');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('Quiz');
  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [classAverageScore, setClassAverageScore] = useState('');
  const [totalPossibleScore, setTotalPossibleScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avg = parseFloat(classAverageScore);
  const total = parseFloat(totalPossibleScore);
  const percentage =
    !Number.isNaN(avg) && !Number.isNaN(total) && total > 0
      ? calculateScorePercentage(avg, total)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (Number.isNaN(avg) || Number.isNaN(total) || total <= 0) {
      setError('Enter valid numeric scores. Total possible score must be greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await createAssessment({
        recording_id: recordingId,
        subject,
        section,
        group_type: groupType,
        assessment_type: assessmentType,
        assessment_name: assessmentName,
        assessment_date: assessmentDate,
        class_average_score: avg,
        total_possible_score: total,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save assessment details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Add Assessment Details" subtitle="Link performance data to this recording" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Subject" required>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Information Management"
            />
          </FormField>
          <FormField label="Section" required>
            <Input required value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. BSIT 3-A" />
          </FormField>
          <FormField label="Group" required>
            <Select value={groupType} onChange={(e) => setGroupType(e.target.value as GroupType)}>
              {GROUP_TYPES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment Type" required>
            <Select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment Name / Number" required>
            <Input
              required
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              placeholder="e.g. Quiz 3"
            />
          </FormField>
          <FormField label="Assessment Date" required>
            <Input
              type="date"
              required
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
            />
          </FormField>
          <FormField label="Class Average Score" required>
            <Input
              type="number"
              step="0.01"
              required
              value={classAverageScore}
              onChange={(e) => setClassAverageScore(e.target.value)}
              placeholder="e.g. 12"
            />
          </FormField>
          <FormField label="Total Possible Score" required>
            <Input
              type="number"
              step="0.01"
              required
              value={totalPossibleScore}
              onChange={(e) => setTotalPossibleScore(e.target.value)}
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

        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          Save Assessment Details
        </Button>
      </form>
    </Card>
  );
}
