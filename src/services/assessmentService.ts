import { supabase } from './supabase';
import { calculateScorePercentage } from '../utils/calculations';
import type { Assessment, AssessmentType, GroupType } from '../types';

export interface CreateAssessmentInput {
  recording_id: string;
  subject: string;
  section: string;
  group_type: GroupType;
  assessment_type: AssessmentType;
  assessment_name: string;
  assessment_date: string;
  class_average_score: number;
  total_possible_score: number;
}

/**
 * Fetches all non-archived assessments, joined with their recording (and device).
 */
export async function fetchAssessments(): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*, recording:recordings(*, device:devices(*))')
    .eq('is_archived', false)
    .order('assessment_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

/**
 * Fetches a single assessment by id.
 */
export async function fetchAssessmentById(id: string): Promise<Assessment | null> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*, recording:recordings(*, device:devices(*))')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Assessment;
}

/**
 * Fetches the (single) non-archived assessment tied to a recording, if any.
 */
export async function fetchAssessmentByRecordingId(
  recordingId: string
): Promise<Assessment | null> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('recording_id', recordingId)
    .eq('is_archived', false)
    .maybeSingle();
  if (error) throw error;
  return data as Assessment | null;
}

/**
 * Creates a new assessment record, auto-calculating the score percentage.
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<Assessment> {
  const score_percentage = calculateScorePercentage(
    input.class_average_score,
    input.total_possible_score
  );
  const { data, error } = await supabase
    .from('assessments')
    .insert({ ...input, score_percentage, is_archived: false })
    .select()
    .single();
  if (error) throw error;
  return data as Assessment;
}

/**
 * Archives an assessment (soft delete).
 */
export async function archiveAssessment(id: string): Promise<void> {
  const { error } = await supabase
    .from('assessments')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Restores a previously archived assessment.
 */
export async function restoreAssessment(id: string): Promise<void> {
  const { error } = await supabase
    .from('assessments')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fetches archived assessments only, for the Archived Records page.
 */
export async function fetchArchivedAssessments(): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*, recording:recordings(*, device:devices(*))')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assessment[];
}

/** Distinct subject list drawn from non-archived assessments, for filters. */
export async function fetchDistinctSubjects(): Promise<string[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('subject')
    .eq('is_archived', false);
  if (error) throw error;
  const subjects = new Set((data ?? []).map((r: { subject: string }) => r.subject));
  return Array.from(subjects).sort();
}
