import { getAssessmentState, type AssessmentState } from './assessment';
import type { Assessment, Recording, RecordingGroup } from '../types';

/**
 * An "assessment unit" is what the user thinks of as one assessment: either a
 * single ungrouped recording, or an assessment group with all of its
 * recordings (a group counts once, however many recordings it holds).
 */
export interface AssessmentUnit {
  key: string;
  group: RecordingGroup | null;
  recordings: Recording[];
  assessment: Assessment | null;
  state: AssessmentState;
  /** Groups only: Ongoing until the assessment is marked completed. */
  progress: 'ongoing' | 'completed' | null;
}

/** Pass ACTIVE recordings (not archived, not still recording) and ACTIVE assessments. */
export function deriveUnits(recordings: Recording[], assessments: Assessment[]): AssessmentUnit[] {
  const units: AssessmentUnit[] = [];
  const byGroup = new Map<string, Recording[]>();

  for (const r of recordings) {
    if (r.group_id) byGroup.set(r.group_id, [...(byGroup.get(r.group_id) ?? []), r]);
  }

  for (const [groupId, members] of byGroup) {
    const assessment = assessments.find((a) => a.group_id === groupId) ?? null;
    units.push({
      key: `group:${groupId}`,
      group: members[0].group ?? { id: groupId, name: 'Assessment group', created_at: '' },
      recordings: members,
      assessment,
      state: getAssessmentState(assessment, members),
      progress: assessment?.is_finalized ? 'completed' : 'ongoing',
    });
  }

  for (const r of recordings) {
    if (r.group_id) continue;
    const assessment = assessments.find((a) => a.recording_id === r.id) ?? null;
    units.push({
      key: `recording:${r.id}`,
      group: null,
      recordings: [r],
      assessment,
      state: getAssessmentState(assessment, [r]),
      progress: null,
    });
  }
  return units;
}
