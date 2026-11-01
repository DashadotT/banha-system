import { supabase } from './supabase';
import { calculateScorePercentage } from '../utils/calculations';
import { groupRecordings, updateRecordingSession } from './recordingService';
import { defaultGroupName, hasIdentity } from '../utils/assessment';
import type { Assessment, AssessmentType, GroupType, Recording, RecordingGroup } from '../types';

/** Assessment fields (classroom / schedule belong to each recording instead). */
export interface AssessmentDetailsInput {
  subject: string | null;
  section: string | null;
  group_type: GroupType | null;
  assessment_type: AssessmentType | null;
  assessment_number: number | null;
  class_average_score: number | null;
  total_possible_score: number | null;
  /** Final result, entered once the assessment is completed. */
  score_percentage: number | null;
  is_finalized: boolean;
  show_in_assessments: boolean;
}

export type CreateAssessmentInput = AssessmentDetailsInput & {
  /** Exactly one of recording_id / group_id identifies the owner. */
  recording_id?: string | null;
  group_id?: string | null;
  assessment_date: string;
};

const ASSESSMENT_SELECT =
  '*, recording:recordings(*), group:recording_groups(id, name, created_at)';

/** Calculated from average / total when both exist, otherwise the entered percentage. */
function scorePercentage(input: AssessmentDetailsInput): number | null {
  const { class_average_score: avg, total_possible_score: total } = input;
  if (avg !== null && total !== null && total > 0) return calculateScorePercentage(avg, total);
  return input.score_percentage;
}

/** An assessment visible in active lists, with the active recordings it covers. */
export interface ActiveAssessment {
  assessment: Assessment;
  /** Non-archived recordings belonging to this assessment (≥ 1). */
  recordings: Recording[];
}

/**
 * Non-archived assessments that still have at least one non-archived
 * recording. Assessments owned by a group cover every active member.
 * This is the single source of truth for the Assessments page, Dashboard
 * counts and Statistical Analysis.
 */
export async function fetchActiveAssessments(filters: {
  subject?: string;
  assessmentType?: string;
  groupType?: GroupType;
  assessmentNumber?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  /** Only assessments published to the Assessments page. */
  publishedOnly?: boolean;
} = {}): Promise<ActiveAssessment[]> {
  let query = supabase.from('assessments').select(ASSESSMENT_SELECT).eq('is_archived', false);

  if (filters.publishedOnly) query = query.eq('show_in_assessments', true);
  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.assessmentType) query = query.eq('assessment_type', filters.assessmentType);
  if (filters.groupType) query = query.eq('group_type', filters.groupType);
  if (filters.assessmentNumber) query = query.eq('assessment_number', filters.assessmentNumber);
  if (filters.dateFrom) query = query.gte('assessment_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('assessment_date', filters.dateTo);

  const { data, error } = await query.order('assessment_date', { ascending: false });
  if (error) throw error;
  const assessments = (data ?? []) as Assessment[];
  if (assessments.length === 0) return [];

  const groupIds = Array.from(
    new Set(assessments.map((a) => a.group_id).filter((g): g is string => Boolean(g)))
  );
  const membersByGroup = new Map<string, Recording[]>();
  if (groupIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from('recordings')
      .select('*')
      .in('group_id', groupIds)
      .eq('is_archived', false)
      .order('started_at', { ascending: true });
    if (membersError) throw membersError;
    for (const m of (members ?? []) as Recording[]) {
      const list = membersByGroup.get(m.group_id as string) ?? [];
      list.push(m);
      membersByGroup.set(m.group_id as string, list);
    }
  }

  const result: ActiveAssessment[] = [];
  for (const assessment of assessments) {
    const recordings = assessment.group_id
      ? membersByGroup.get(assessment.group_id) ?? []
      : assessment.recording && !assessment.recording.is_archived
        ? [assessment.recording]
        : [];
    if (recordings.length > 0) result.push({ assessment, recordings });
  }
  return result;
}

/** Fetches a single assessment by id. */
export async function fetchAssessmentById(id: string): Promise<Assessment | null> {
  const { data, error } = await supabase
    .from('assessments')
    .select(ASSESSMENT_SELECT)
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Assessment;
}

/**
 * The assessment that applies to a recording: its group's assessment when it
 * belongs to a group, otherwise its own. Prefers a non-archived one; falls
 * back to the latest archived one so it stays viewable.
 */
export async function fetchAssessmentForRecording(
  recordingId: string,
  groupId: string | null
): Promise<Assessment | null> {
  const owner = groupId
    ? `recording_id.eq.${recordingId},group_id.eq.${groupId}`
    : `recording_id.eq.${recordingId}`;
  const { data, error } = await supabase
    .from('assessments')
    .select(ASSESSMENT_SELECT)
    .or(owner)
    .order('is_archived', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Assessment | null;
}

/**
 * Creates assessment details for a recording or a group. Only one
 * non-archived assessment may exist per owner; if one already exists it is
 * returned instead of creating a duplicate.
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<Assessment> {
  const ownerId = input.group_id ?? input.recording_id ?? null;
  if (!ownerId) throw new Error('An assessment needs a recording or a group.');

  const existing = await fetchActiveAssessmentForOwner(input.recording_id ?? null, input.group_id ?? null);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      ...input,
      recording_id: input.group_id ? null : input.recording_id,
      group_id: input.group_id ?? null,
      score_percentage: scorePercentage(input),
      is_archived: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Assessment;
}

async function fetchActiveAssessmentForOwner(
  recordingId: string | null,
  groupId: string | null
): Promise<Assessment | null> {
  let query = supabase.from('assessments').select('*').eq('is_archived', false);
  query = groupId ? query.eq('group_id', groupId) : query.eq('recording_id', recordingId as string);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data as Assessment | null;
}

/** Updates an assessment's details, recalculating the score percentage. */
export async function updateAssessment(
  id: string,
  input: AssessmentDetailsInput
): Promise<Assessment> {
  const { data, error } = await supabase
    .from('assessments')
    .update({ ...input, score_percentage: scorePercentage(input) })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Assessment;
}

/** Adds / removes an assessment from the Assessments page. Nothing else changes. */
export async function setAssessmentPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase
    .from('assessments')
    .update({ show_in_assessments: published })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Clears assessment details. The recording(s) and all sensor data are kept;
 * their status returns to "Pending Assessment Details".
 */
export async function resetAssessmentDetails(id: string): Promise<void> {
  const { error } = await supabase.rpc('reset_assessment_details', { p_assessment_id: id });
  if (error) throw new Error(error.message);
}

/**
 * Archives an assessment together with its linked recording(s) so it leaves
 * both the Assessments and Recordings pages. Nothing is deleted.
 */
export async function archiveAssessment(id: string): Promise<void> {
  const { error } = await supabase.rpc('archive_assessment', { p_assessment_id: id });
  if (error) throw new Error(error.message);
}

/** Restores an archived assessment and the recordings archived with it. */
export async function restoreAssessment(id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_assessment', { p_assessment_id: id });
  if (error) throw new Error(error.message);
}

/**
 * Permanently deletes an assessment's details. Linked recordings and sensor
 * readings are NOT deleted. Irreversible.
 */
export async function deleteAssessmentPermanently(id: string): Promise<void> {
  const { error } = await supabase.from('assessments').delete().eq('id', id);
  if (error) throw error;
}

/** Archived assessments with their (archived) recordings, for Archived Records. */
export async function fetchArchivedAssessments(): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select(ASSESSMENT_SELECT)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

/** Recordings covered by an assessment, regardless of archive state. */
export async function fetchRecordingsForAssessment(a: Assessment): Promise<Recording[]> {
  let query = supabase.from('recordings').select('*').order('started_at', { ascending: true });
  if (a.group_id) query = query.eq('group_id', a.group_id);
  else if (a.recording_id) query = query.eq('id', a.recording_id);
  else return [];
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Recording[];
}


export interface GroupAssessment {
  group: RecordingGroup;
  assessment: Assessment;
  memberCount: number;
}

/** Assessment groups that still have recordings, with their shared assessment. */
export async function fetchGroupAssessments(): Promise<GroupAssessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select(ASSESSMENT_SELECT)
    .eq('is_archived', false)
    .not('group_id', 'is', null);
  if (error) throw error;
  const assessments = (data ?? []) as Assessment[];
  if (assessments.length === 0) return [];

  const { data: members, error: membersError } = await supabase
    .from('recordings')
    .select('id, group_id')
    .eq('is_archived', false)
    .in('group_id', assessments.map((a) => a.group_id as string));
  if (membersError) throw membersError;

  const counts = new Map<string, number>();
  for (const m of (members ?? []) as { group_id: string }[]) {
    counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  }
  return assessments
    .filter((a) => a.group && (counts.get(a.group_id as string) ?? 0) > 0)
    .map((a) => ({
      group: a.group as RecordingGroup,
      assessment: a,
      memberCount: counts.get(a.group_id as string) ?? 0,
    }));
}

/** True when at least one assessment field (not classroom / schedule) has a value. */
export function hasAssessmentFields(d: AssessmentDetailsInput): boolean {
  return [
    d.subject, d.section, d.group_type, d.assessment_type, d.assessment_number,
    d.class_average_score, d.total_possible_score, d.score_percentage,
  ].some((v) => v !== null);
}

export type GroupChoice =
  | { kind: 'none' }
  | { kind: 'new'; name: string }
  | { kind: 'existing'; groupId: string };

/**
 * Saves the assessment form for one recording:
 *  1. this recording's classroom / schedule (when `session` is given),
 *  2. the assessment details — for the group when the recording is grouped,
 *     otherwise for the recording itself,
 *  3. optionally creating a new assessment group or joining an existing one
 *     (the database re-checks that Subject, Section, Group, Assessment Type
 *     and Assessment Number match).
 * Original recording data and readings are never modified.
 */
export async function saveRecordingAssessment(args: {
  recording: Recording;
  assessment: Assessment | null;
  details: AssessmentDetailsInput;
  session: { classroom_type: string | null; class_schedule: string | null } | null;
  assessmentDate: string;
  groupChoice: GroupChoice;
}): Promise<void> {
  const { recording, assessment, details, session, assessmentDate, groupChoice } = args;

  if (session) await updateRecordingSession(recording.id, session);

  // Only classroom / schedule were entered: nothing to store on the assessment yet.
  if (!assessment && !hasAssessmentFields(details)) return;

  // Grouped recording: details belong to the group.
  if (recording.group_id) {
    if (assessment) await updateAssessment(assessment.id, details);
    else {
      await createAssessment({ ...details, group_id: recording.group_id, assessment_date: assessmentDate });
    }
    return;
  }

  // Joining an existing group: the group's own details stay as they are.
  if (groupChoice.kind === 'existing') {
    if (!hasIdentity(details)) {
      throw new Error('Subject, Section, Group, Assessment Type and Assessment Number are needed to join an assessment group.');
    }
    // Only the identifying fields are saved here; results / progress /
    // publication belong to the group's shared assessment. Any values the
    // recording's own assessment already had are kept as they were.
    const identityOnly: AssessmentDetailsInput = {
      ...details,
      class_average_score: assessment?.class_average_score ?? null,
      total_possible_score: assessment?.total_possible_score ?? null,
      score_percentage: assessment?.score_percentage ?? null,
      is_finalized: assessment?.is_finalized ?? false,
      show_in_assessments: assessment?.show_in_assessments ?? false,
    };
    if (assessment) await updateAssessment(assessment.id, identityOnly);
    else await createAssessment({ ...identityOnly, recording_id: recording.id, assessment_date: assessmentDate });
    await groupRecordings([recording.id], { groupId: groupChoice.groupId });
    return;
  }

  if (assessment) await updateAssessment(assessment.id, details);
  else await createAssessment({ ...details, recording_id: recording.id, assessment_date: assessmentDate });

  if (groupChoice.kind === 'new') {
    if (!hasIdentity(details)) {
      throw new Error('Subject, Section, Group, Assessment Type and Assessment Number are needed to create an assessment group.');
    }
    await groupRecordings([recording.id], {
      groupName: groupChoice.name.trim() || defaultGroupName(details as never),
    });
  }
}
