import { supabase } from './supabase';
import { computeIndependentTTest, computePearson } from '../utils/statistics';
import { mean, round } from '../utils/calculations';
import type { Assessment, DateRange, PearsonResult, TTestResult } from '../types';

export interface AnalysisRow {
  assessment: Assessment;
  avgCo2: number | null;
  avgTemperature: number | null;
  avgNoise: number | null;
}

export interface AnalysisFilters {
  subject?: string;
  assessmentType?: string;
  assessmentName?: string;
  dateRange?: DateRange;
}

/**
 * Builds the dataset used across the Statistical Analysis page: every
 * non-archived assessment paired with the mean environmental readings taken
 * during its associated recording. Archived assessments and archived
 * recordings are always excluded.
 */
export async function fetchAnalysisDataset(filters: AnalysisFilters = {}): Promise<AnalysisRow[]> {
  let query = supabase
    .from('assessments')
    .select('*, recording:recordings!inner(*, device:devices(*))')
    .eq('is_archived', false)
    .eq('recording.is_archived', false);

  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.assessmentType) query = query.eq('assessment_type', filters.assessmentType);
  if (filters.assessmentName) query = query.eq('assessment_name', filters.assessmentName);
  if (filters.dateRange?.from) query = query.gte('assessment_date', filters.dateRange.from);
  if (filters.dateRange?.to) query = query.lte('assessment_date', filters.dateRange.to);

  const { data, error } = await query;
  if (error) throw error;
  const assessments = (data ?? []) as Assessment[];
  if (assessments.length === 0) return [];

  const recordingIds = Array.from(new Set(assessments.map((a) => a.recording_id)));
  const { data: readings, error: readingsError } = await supabase
    .from('environmental_readings')
    .select('recording_id, average_co2, average_temperature, average_noise')
    .in('recording_id', recordingIds);
  if (readingsError) throw readingsError;

  const byRecording = new Map<
    string,
    { co2: number[]; temp: number[]; noise: number[] }
  >();
  for (const r of readings ?? []) {
    const bucket = byRecording.get(r.recording_id) ?? { co2: [], temp: [], noise: [] };
    bucket.co2.push(r.average_co2);
    bucket.temp.push(r.average_temperature);
    bucket.noise.push(r.average_noise);
    byRecording.set(r.recording_id, bucket);
  }

  return assessments.map((assessment) => {
    const bucket = byRecording.get(assessment.recording_id);
    return {
      assessment,
      avgCo2: bucket && bucket.co2.length ? round(mean(bucket.co2), 1) : null,
      avgTemperature: bucket && bucket.temp.length ? round(mean(bucket.temp), 1) : null,
      avgNoise: bucket && bucket.noise.length ? round(mean(bucket.noise), 1) : null,
    };
  });
}

/**
 * Runs the three Pearson correlations (CO2, Temperature, Noise vs Score %)
 * against the given, already-filtered analysis rows.
 */
export function runPearsonCorrelations(rows: AnalysisRow[]): PearsonResult[] {
  const co2Pairs = rows.filter((r) => r.avgCo2 !== null);
  const tempPairs = rows.filter((r) => r.avgTemperature !== null);
  const noisePairs = rows.filter((r) => r.avgNoise !== null);

  return [
    computePearson(
      'CO₂ concentration',
      'Score Percentage',
      co2Pairs.map((r) => r.avgCo2 as number),
      co2Pairs.map((r) => r.assessment.score_percentage)
    ),
    computePearson(
      'Temperature',
      'Score Percentage',
      tempPairs.map((r) => r.avgTemperature as number),
      tempPairs.map((r) => r.assessment.score_percentage)
    ),
    computePearson(
      'Noise Level',
      'Score Percentage',
      noisePairs.map((r) => r.avgNoise as number),
      noisePairs.map((r) => r.assessment.score_percentage)
    ),
  ];
}

/**
 * Runs an independent-samples t-test per subject present in the dataset,
 * comparing Experimental vs Comparison group score percentages.
 */
export function runTTestsBySubject(rows: AnalysisRow[]): TTestResult[] {
  const subjects = Array.from(new Set(rows.map((r) => r.assessment.subject))).sort();
  return subjects.map((subject) => {
    const subjectRows = rows.filter((r) => r.assessment.subject === subject);
    const experimental = subjectRows
      .filter((r) => r.assessment.group_type === 'Experimental')
      .map((r) => r.assessment.score_percentage);
    const comparison = subjectRows
      .filter((r) => r.assessment.group_type === 'Comparison')
      .map((r) => r.assessment.score_percentage);
    return computeIndependentTTest(subject, experimental, comparison);
  });
}
