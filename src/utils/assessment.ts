import type { Assessment, Recording, RecordingStatus } from '../types';

/** What must match for two recordings to be the same assessment. */
type Identity = Pick<Assessment, 'subject' | 'section' | 'group_type' | 'assessment_type' | 'assessment_number'>;

export function identityKey(a: Identity | null | undefined): string | null {
  if (!a) return null;
  if (!a.subject || !a.section || !a.group_type || !a.assessment_type || a.assessment_number === null) return null;
  return [a.subject.trim().toLowerCase(), a.section.trim().toLowerCase(), a.group_type, a.assessment_type.trim().toLowerCase(), a.assessment_number].join('|');
}

export const hasIdentity = (a: Identity | null | undefined) => identityKey(a) !== null;

export function resultsComplete(a: Pick<Assessment, 'class_average_score' | 'score_percentage' | 'is_finalized'>): boolean {
  return a.is_finalized && a.class_average_score !== null && a.score_percentage !== null;
}

export function sessionComplete(r: Pick<Recording, 'classroom_type' | 'class_schedule'>): boolean {
  return Boolean(r.classroom_type && r.class_schedule);
}

export type AssessmentState = 'pending' | 'incomplete' | 'completed';

/**
 * Completion of an assessment's details, independent of whether it was added
 * to the Assessments page:
 *  pending    – no assessment details at all
 *  incomplete – some details missing (identity, a recording's classroom /
 *               schedule, or the final results)
 *  completed  – everything filled in, final results included
 */
export function getAssessmentState(
  a: Assessment | null,
  recordings: Pick<Recording, 'classroom_type' | 'class_schedule'>[]
): AssessmentState {
  if (!a) return 'pending';
  const done = hasIdentity(a) && resultsComplete(a) && recordings.every(sessionComplete);
  return done ? 'completed' : 'incomplete';
}

export const STATE_TO_STATUS: Record<AssessmentState, RecordingStatus> = {
  pending: 'pending_assessment',
  incomplete: 'incomplete_assessment',
  completed: 'completed',
};

export const STATE_LABEL: Record<AssessmentState, string> = {
  pending: 'Pending Assessment Details',
  incomplete: 'Incomplete Assessment Details',
  completed: 'Completed',
};

export function assessmentTitle(a: Pick<Assessment, 'subject' | 'assessment_type' | 'assessment_number'>): string {
  const typePart = [a.assessment_type, a.assessment_number !== null ? `#${a.assessment_number}` : null]
    .filter(Boolean)
    .join(' ');
  return [a.subject, typePart].filter(Boolean).join(' — ') || 'Assessment details';
}

export function assessmentLabel(a: Assessment): string {
  const title = assessmentTitle(a);
  return a.group?.name ? `${title} (${a.group.name})` : title;
}

export function defaultGroupName(a: Identity): string {
  return [a.subject, a.section, a.group_type, [a.assessment_type, a.assessment_number].filter((x) => x !== null).join(' ')]
    .filter(Boolean)
    .join(' · ');
}

/** Unique non-empty values, in first-seen order. */
export function distinctValues(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}
