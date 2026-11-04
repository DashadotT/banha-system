import { useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent, ReactNode } from 'react';
import { CheckCircle2, Eraser, Layers, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { FormField, Input, Select } from '../common/FormField';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/Modal';
import { calculateScorePercentage } from '../../utils/calculations';
import {
  fetchGroupAssessments,
  hasAssessmentFields,
  resetAssessmentDetails,
  saveRecordingAssessment,
  type AssessmentDetailsInput,
  type GroupChoice,
} from '../../services/assessmentService';
import { fetchSettingOptions } from '../../services/settingsService';
import { useAsync } from '../../hooks/useAsync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { formatDate, toInputDate } from '../../utils/dateTime';
import { defaultGroupName, identityKey, sessionComplete } from '../../utils/assessment';
import type { Assessment, GroupType, Recording, SettingCategory, SettingOption } from '../../types';

const GROUP_TYPES: GroupType[] = ['Experimental', 'Comparison'];

interface DraftState {
  subject: string;
  section: string;
  groupType: GroupType | '';
  assessmentType: string;
  assessmentNumber: string;
  classroomType: string;
  classSchedule: string;
  progress: 'ongoing' | 'completed';
  classAverageScore: string;
  totalPossibleScore: string;
  scorePercentage: string;
  addToAssessments: 'yes' | 'no';
}

const EMPTY_DRAFT: DraftState = {
  subject: '',
  section: '',
  groupType: '',
  assessmentType: '',
  assessmentNumber: '',
  classroomType: '',
  classSchedule: '',
  progress: 'ongoing',
  classAverageScore: '',
  totalPossibleScore: '',
  scorePercentage: '',
  addToAssessments: 'no',
};

function buildDraft(recording: Recording, a: Assessment | null): DraftState {
  return {
    subject: a?.subject ?? '',
    section: a?.section ?? '',
    groupType: a?.group_type ?? '',
    assessmentType: a?.assessment_type ?? '',
    assessmentNumber: a?.assessment_number != null ? String(a.assessment_number) : '',
    classroomType: recording.classroom_type ?? '',
    classSchedule: recording.class_schedule ?? '',
    progress: a?.is_finalized ? 'completed' : 'ongoing',
    classAverageScore: a?.class_average_score != null ? String(a.class_average_score) : '',
    totalPossibleScore: a?.total_possible_score != null ? String(a.total_possible_score) : '',
    scorePercentage: a?.score_percentage != null ? String(a.score_percentage) : '',
    addToAssessments: a?.show_in_assessments ? 'yes' : 'no',
  };
}

const draftKey = (recordingId: string) => `banha:assessment-draft:v2:${recordingId}`;

function loadDraft(recordingId: string): DraftState | null {
  try {
    const raw = window.localStorage.getItem(draftKey(recordingId));
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
function saveDraft(recordingId: string, draft: DraftState) {
  try {
    window.localStorage.setItem(draftKey(recordingId), JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}
function clearDraft(recordingId: string) {
  try {
    window.localStorage.removeItem(draftKey(recordingId));
  } catch {
    // ignore
  }
}

function useOptions(category: SettingCategory) {
  return useAsync(() => fetchSettingOptions(category));
}

const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());

function OptionSelect({
  label,
  value,
  onChange,
  options,
  loading,
  placeholder,
  emptyHint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SettingOption[] | null;
  loading: boolean;
  placeholder: string;
  emptyHint: string;
}) {
  const list = options ?? [];
  return (
    <FormField label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {value && !list.some((o) => o.value === value) && <option value={value}>{value} (archived)</option>}
        {list.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.value}
          </option>
        ))}
      </Select>
      {list.length === 0 && !loading && <p className="mt-1 text-xs text-amber-600">{emptyHint}</p>}
    </FormField>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</p>;
}

/**
 * The single assessment-details form used for pending, incomplete and
 * completed assessments, for a single recording or an assessment group.
 */
export function AssessmentForm({
  recording,
  assessment,
  members,
  showSession = true,
  embedded = false,
  onSaved,
  onCancel,
  onReset,
}: {
  /** The recording being edited (for a group panel: any member). */
  recording: Recording;
  /** The assessment that applies (own, or the group's) — null while pending. */
  assessment: Assessment | null;
  /** Active recordings sharing this assessment (just [recording] when ungrouped). */
  members: Recording[];
  /** Show this recording's classroom / schedule fields. */
  showSession?: boolean;
  embedded?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
  onReset?: () => void;
}) {
  const isGrouped = Boolean(recording.group_id);
  const groupName = recording.group?.name;

  const initial = useState<DraftState>(() => buildDraft(recording, assessment))[0];
  const [draft, setDraft] = useState<DraftState>(() => (assessment ? initial : loadDraft(recording.id) ?? initial));
  const [choiceTouched, setChoiceTouched] = useState(false);
  const [choice, setChoice] = useState<GroupChoice['kind']>('none');
  const [newGroupName, setNewGroupName] = useState('');
  const [chosenGroupId, setChosenGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<(() => Promise<void>) | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(assessment ? initial : EMPTY_DRAFT);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!assessment) saveDraft(recording.id, draft);
  }, [recording.id, draft, assessment]);

  const subjects = useOptions('subject');
  const sections = useOptions('section');
  const types = useOptions('assessment_type');
  const classrooms = useOptions('classroom_type');
  const schedules = useOptions('class_schedule');
  const groupList = useAsync(fetchGroupAssessments);

  function refreshAllOptions() {
    [subjects, sections, types, classrooms, schedules].forEach((o) => o.refetch());
  }
  useRealtimeRefresh(['settings_options'], refreshAllOptions);
  const optionsLoading = [subjects, sections, types, classrooms, schedules].some((o) => o.loading);

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  // --- assessment group suggestions (ungrouped recordings only) -------------
  const typedIdentity = {
    subject: blankToNull(draft.subject),
    section: blankToNull(draft.section),
    group_type: draft.groupType === '' ? null : draft.groupType,
    assessment_type: blankToNull(draft.assessmentType),
    assessment_number: draft.assessmentNumber.trim() === '' ? null : Number(draft.assessmentNumber),
  };
  const typedKey = identityKey(typedIdentity);
  const matches = useMemo(
    () => (typedKey ? (groupList.data ?? []).filter((g) => identityKey(g.assessment) === typedKey) : []),
    [groupList.data, typedKey]
  );
  const openMatch = matches.find((m) => !m.assessment.is_finalized);

  const canChooseGroup = !isGrouped && showSession;
  const effectiveKind: GroupChoice['kind'] = !canChooseGroup
    ? 'none'
    : choiceTouched
      ? choice
      : openMatch
        ? 'existing'
        : 'none';
  const effectiveGroupId = choiceTouched ? chosenGroupId : openMatch?.group.id ?? '';
  const joiningExisting = effectiveKind === 'existing';

  const avg = parseFloat(draft.classAverageScore);
  const total = parseFloat(draft.totalPossibleScore);
  const computedPercentage =
    !Number.isNaN(avg) && !Number.isNaN(total) && total > 0 ? calculateScorePercentage(avg, total) : null;
  const completed = draft.progress === 'completed';

  const dateSource = [...members, recording].map((m) => m.ended_at ?? m.started_at).sort()[0];
  const assessmentDate = toInputDate(dateSource);

  function buildDetails(): AssessmentDetailsInput | string {
    const numberRaw = draft.assessmentNumber.trim();
    const number = numberRaw === '' ? null : Number(numberRaw);
    if (number !== null && (!Number.isInteger(number) || number < 1)) {
      return 'Assessment Number must be a whole number, 1 or higher.';
    }
    const avgRaw = draft.classAverageScore.trim();
    const totalRaw = draft.totalPossibleScore.trim();
    const pctRaw = draft.scorePercentage.trim();
    const average = avgRaw === '' ? null : Number(avgRaw);
    const possible = totalRaw === '' ? null : Number(totalRaw);
    const manualPct = pctRaw === '' ? null : Number(pctRaw);
    if (average !== null && (Number.isNaN(average) || average < 0)) return 'Final Class Average must be a number, 0 or higher.';
    if (possible !== null && (Number.isNaN(possible) || possible <= 0)) return 'Total Possible Score must be greater than zero.';
    if (average !== null && possible !== null && average > possible) {
      return 'Final Class Average cannot be higher than the Total Possible Score.';
    }
    if (manualPct !== null && (Number.isNaN(manualPct) || manualPct < 0 || manualPct > 100)) {
      return 'Final Score Percentage must be between 0 and 100.';
    }
    if (completed && !joiningExisting && !(average !== null && (possible !== null || manualPct !== null))) {
      return 'Enter the Final Class Average and Final Score Percentage (or Total Possible Score) before marking the assessment as Completed.';
    }

    const publish = draft.addToAssessments === 'yes';
    if (publish && !joiningExisting && !assessment?.show_in_assessments) {
      const thisSession = showSession
        ? Boolean(draft.classroomType && draft.classSchedule)
        : sessionComplete(recording);
      const othersSession = members.filter((m) => m.id !== recording.id).every(sessionComplete);
      const everything =
        identityKey({ ...typedIdentity, assessment_number: number }) !== null &&
        thisSession &&
        othersSession &&
        completed &&
        average !== null &&
        (computedPercentage !== null || manualPct !== null);
      if (!everything) {
        return 'Complete every detail (subject, section, group, type, number, classroom, schedule for each recording) and the final results before adding this assessment to the Assessments page.';
      }
    }

    return {
      subject: typedIdentity.subject,
      section: typedIdentity.section,
      group_type: typedIdentity.group_type,
      assessment_type: typedIdentity.assessment_type,
      assessment_number: number,
      class_average_score: average,
      total_possible_score: possible,
      score_percentage: computedPercentage ?? manualPct,
      is_finalized: completed,
      show_in_assessments: publish,
    };
  }

  async function persist(details: AssessmentDetailsInput, groupChoice: GroupChoice) {
    setSaving(true);
    setError(null);
    try {
      await saveRecordingAssessment({
        recording,
        assessment,
        details,
        session: showSession
          ? { classroom_type: blankToNull(draft.classroomType), class_schedule: blankToNull(draft.classSchedule) }
          : null,
        assessmentDate,
        groupChoice,
      });
      if (!assessment) clearDraft(recording.id);
      setPending(null);
      setSaved(true);
      onSaved();
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Could not save assessment details.');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (saving) return;

    const details = buildDetails();
    if (typeof details === 'string') return setError(details);

    let groupChoice: GroupChoice = { kind: 'none' };
    if (effectiveKind === 'new') {
      if (!typedKey) return setError('Subject, Section, Group, Assessment Type and Assessment Number are required to create an assessment group.');
      groupChoice = { kind: 'new', name: newGroupName.trim() || defaultGroupName(typedIdentity) };
    } else if (effectiveKind === 'existing') {
      if (!typedKey) return setError('Subject, Section, Group, Assessment Type and Assessment Number are required to join an assessment group.');
      if (!effectiveGroupId) return setError('Choose the assessment group to add this recording to.');
      const target = matches.find((m) => m.group.id === effectiveGroupId);
      if (!target) return setError('The selected group does not match these assessment details.');
      if (target.assessment.is_finalized) return setError(`“${target.group.name}” is marked Completed. Set it back to Ongoing before adding recordings.`);
      groupChoice = { kind: 'existing', groupId: effectiveGroupId };
    }

    const identityFields = [
      details.subject, details.section, details.group_type, details.assessment_type, details.assessment_number,
    ];
    const sessionFields = showSession ? [blankToNull(draft.classroomType), blankToNull(draft.classSchedule)] : [];
    const anyFilled =
      [...identityFields, ...sessionFields].some((v) => v !== null) ||
      details.class_average_score !== null ||
      details.total_possible_score !== null ||
      details.score_percentage !== null;
    if (!anyFilled) return setError('Fill in at least one field before saving.');
    if (assessment && !hasAssessmentFields(details)) {
      return setError('All assessment fields are empty. Use Reset Details to clear the assessment instead.');
    }

    const run = () => persist(details, groupChoice);
    if ([...identityFields, ...sessionFields].some((v) => v === null)) {
      setPending(() => run);
      return;
    }
    void run();
  }

  async function handleReset() {
    if (!assessment) return;
    setResetting(true);
    setResetError(null);
    try {
      await resetAssessmentDetails(assessment.id);
      setConfirmReset(false);
      onReset?.();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Could not reset assessment details.');
    } finally {
      setResetting(false);
    }
  }

  if (saved && !assessment) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 size={28} className="text-emerald-500" />
        <p className="text-sm font-medium text-primary">Assessment details saved</p>
      </Card>
    );
  }

  const Wrapper: ElementType = embedded ? 'div' : Card;

  return (
    <Wrapper>
      <div className="mb-4 flex items-start justify-between gap-3">
        <CardHeader
          title={assessment ? 'Edit Assessment Details' : 'Add Assessment Details'}
          subtitle={
            isGrouped
              ? `Shared by all ${members.length} recordings in “${groupName}”`
              : 'Link performance data to this recording'
          }
        />
        <div className="flex shrink-0 items-center gap-2">
          {isDirty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={refreshAllOptions}
            disabled={optionsLoading}
            className="mt-0.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
            title="Refresh dropdown options"
          >
            <RefreshCw size={13} className={optionsLoading ? 'animate-spin' : ''} />
            Refresh options
          </button>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') e.preventDefault();
        }}
        className="space-y-4"
      >
        <p className="text-xs text-slate-500">
          Fill in what you have — at least one field is needed. Missing details can be added later.
        </p>

        <SectionTitle>Assessment (identifies the activity)</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionSelect label="Subject" value={draft.subject} onChange={(v) => update('subject', v)} options={subjects.data}
            loading={subjects.loading} placeholder="Select subject…" emptyHint="No subjects configured yet — add some in System Settings." />
          <OptionSelect label="Section" value={draft.section} onChange={(v) => update('section', v)} options={sections.data}
            loading={sections.loading} placeholder="Select section…" emptyHint="No sections configured yet — add some in System Settings." />
          <FormField label="Group">
            <Select value={draft.groupType} onChange={(e) => update('groupType', e.target.value as GroupType | '')}>
              <option value="">Select group…</option>
              {GROUP_TYPES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <OptionSelect label="Assessment Type" value={draft.assessmentType} onChange={(v) => update('assessmentType', v)}
            options={types.data} loading={types.loading} placeholder="Select type…"
            emptyHint="No assessment types configured yet — add some in System Settings." />
          <FormField label="Assessment Number" hint="e.g. 1 for Activity 1 — identifies the specific activity">
            <Input type="number" min={1} step={1} value={draft.assessmentNumber}
              onChange={(e) => update('assessmentNumber', e.target.value)} placeholder="1" />
          </FormField>
          <FormField label="Assessment Date" hint={members.length > 1 ? 'Earliest recording in the group' : 'Set from the recording date'}>
            <Input type="text" readOnly disabled value={formatDate(assessment?.assessment_date ?? dateSource)} />
          </FormField>
        </div>
        {isGrouped && (
          <p className="text-xs text-slate-500">
            Changing these details changes them for every recording in “{groupName}”.
          </p>
        )}

        {showSession && (
          <>
            <SectionTitle>This recording session</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OptionSelect label="Classroom / Room Type" value={draft.classroomType} onChange={(v) => update('classroomType', v)}
                options={classrooms.data} loading={classrooms.loading} placeholder="Select classroom / room type…"
                emptyHint="No classrooms configured yet — add some in System Settings." />
              <OptionSelect label="Class Schedule" value={draft.classSchedule} onChange={(v) => update('classSchedule', v)}
                options={schedules.data} loading={schedules.loading} placeholder="Select class schedule…"
                emptyHint="No class schedules configured yet — add some in System Settings." />
            </div>
            <p className="text-xs text-slate-500">
              The classroom and schedule can differ between recordings of the same assessment.
            </p>
          </>
        )}

        {canChooseGroup && (
          <>
            <SectionTitle>Assessment group</SectionTitle>
            {matches.length > 0 && (
              <div className="rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-xs text-accent-800">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Layers size={13} /> Matches an existing assessment group:
                </span>{' '}
                {matches.map((m) => `“${m.group.name}” (${m.assessment.is_finalized ? 'Completed' : 'Ongoing'}, ${m.memberCount} recording${m.memberCount === 1 ? '' : 's'})`).join(', ')}
              </div>
            )}
            {typedKey && matches.length === 0 && (
              <p className="text-xs text-slate-500">No existing assessment group matches these details.</p>
            )}
            {!typedKey && (
              <p className="text-xs text-slate-500">
                Enter Subject, Section, Group, Assessment Type and Assessment Number to see matching groups.
              </p>
            )}
            <div className="space-y-2">
              {(
                [
                  ['none', 'Not grouped — keep this recording as its own assessment'],
                  ['new', 'Create a new assessment group (for an activity that continues on other days)'],
                  ['existing', 'Add to an existing assessment group'],
                ] as const
              ).map(([kind, text]) => (
                <label key={kind} className="flex items-start gap-2 text-sm text-primary">
                  <input
                    type="radio"
                    name="group-choice"
                    className="mt-1"
                    checked={effectiveKind === kind}
                    disabled={kind !== 'none' && !typedKey}
                    onChange={() => {
                      setChoiceTouched(true);
                      setChoice(kind);
                      if (kind === 'existing' && !chosenGroupId) setChosenGroupId(openMatch?.group.id ?? '');
                      if (kind === 'new' && !newGroupName) setNewGroupName(defaultGroupName(typedIdentity));
                    }}
                  />
                  <span className="flex-1">
                    {text}
                    {kind === 'new' && effectiveKind === 'new' && (
                      <Input className="mt-2" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Assessment group name" />
                    )}
                    {kind === 'existing' && effectiveKind === 'existing' && (
                      <Select className="mt-2" value={effectiveGroupId}
                        onChange={(e) => {
                          setChoiceTouched(true);
                          setChoice('existing');
                          setChosenGroupId(e.target.value);
                        }}>
                        <option value="">{matches.length ? 'Select matching group…' : 'No matching group'}</option>
                        {matches.map((m) => (
                          <option key={m.group.id} value={m.group.id} disabled={m.assessment.is_finalized}>
                            {m.group.name} — {m.assessment.is_finalized ? 'Completed' : 'Ongoing'} ({m.memberCount})
                          </option>
                        ))}
                      </Select>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {joiningExisting ? (
          <p className="rounded-md bg-surface px-3 py-2 text-xs text-slate-600">
            Progress, final results and the Assessments page setting are managed on the assessment group — they are
            not changed here.
          </p>
        ) : (
          <>
            <SectionTitle>Progress & final results</SectionTitle>
            <FormField label="Assessment Progress" hint="Mark Completed once the activity is finished — then enter the overall results">
              <Select value={draft.progress} onChange={(e) => update('progress', e.target.value as 'ongoing' | 'completed')}>
                <option value="ongoing">Ongoing — more recordings may be added</option>
                <option value="completed">Completed — activity finished</option>
              </Select>
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Final Class Average">
                <Input type="number" step="0.01" disabled={!completed} value={draft.classAverageScore}
                  onChange={(e) => update('classAverageScore', e.target.value)} placeholder="e.g. 12" />
              </FormField>
              <FormField label="Total Possible Score">
                <Input type="number" step="0.01" disabled={!completed} value={draft.totalPossibleScore}
                  onChange={(e) => update('totalPossibleScore', e.target.value)} placeholder="e.g. 15" />
              </FormField>
              <FormField label="Final Score Percentage"
                hint={computedPercentage !== null ? 'Calculated from average ÷ total' : 'Auto-calculated, or enter it directly'}>
                <Input type="number" step="0.01" min={0} max={100} disabled={!completed || computedPercentage !== null}
                  value={computedPercentage !== null ? String(computedPercentage) : draft.scorePercentage}
                  onChange={(e) => update('scorePercentage', e.target.value)} placeholder="e.g. 80" />
              </FormField>
            </div>
            {!completed && (
              <p className="text-xs text-slate-500">
                Final results are entered once the assessment is Completed. They describe the whole assessment
                {isGrouped || effectiveKind === 'new' ? ' (all grouped recordings)' : ''}, not a single session.
              </p>
            )}

            <FormField label="Add to Assessments"
              hint="Needs every detail and the final results. Separate from completion — you can change it later.">
              <Select value={draft.addToAssessments} onChange={(e) => update('addToAssessments', e.target.value as 'yes' | 'no')}>
                <option value="no">No — keep in Recordings only</option>
                <option value="yes">Yes — add to Assessments</option>
              </Select>
            </FormField>
          </>
        )}

        {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={saving} disabled={saving}>
            {assessment ? 'Save Changes' : 'Save Assessment Details'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
          {assessment && (
            <Button type="button" variant="outline" icon={<Eraser size={14} />} className="ml-auto text-rose-600"
              onClick={() => { setResetError(null); setConfirmReset(true); }} disabled={saving}>
              Reset Details
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => pending && pending()}
        title="Incomplete assessment details"
        confirmLabel="Save anyway"
        loading={saving}
      >
        Some assessment details are incomplete. Do you want to save anyway?
        <span className="mt-2 block text-xs text-slate-500">
          It will show as “Incomplete Assessment Details” until everything, including the final results, is filled in.
        </span>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset assessment details"
        confirmLabel="Reset details"
        variant="danger"
        loading={resetting}
        error={resetError}
      >
        This clears the assessment details{isGrouped ? ` of “${groupName}” (shared by all its recordings)` : ''} and
        removes them from the Assessments page. The recording{isGrouped ? 's' : ''}, their classroom/schedule and all
        sensor data are kept, and the status returns to Pending Assessment Details.
      </ConfirmDialog>
    </Wrapper>
  );
}
