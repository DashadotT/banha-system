import { supabase } from './supabase';
import { computeIndependentTTest, computePearson } from '../utils/statistics';
import { max, mean, min, round } from '../utils/calculations';
import { fetchActiveAssessments } from './assessmentService';
import type { Assessment, DateRange, GroupType, PearsonResult, Recording, TTestResult } from '../types';

interface ReadingPoint {
  recording_id: string;
  average_temperature: number;
  average_noise: number;
}

export interface EnvStats {
  packetCount: number;
  avgTemperature: number | null;
  avgNoise: number | null;
  peakTemperature: number | null;
  lowestTemperature: number | null;
  peakNoise: number | null;
  lowestNoise: number | null;
  /** Exact sums, so groups of recordings can be pooled without averaging averages. */
  sumTemperature: number;
  sumNoise: number;
}

function summarize(readings: ReadingPoint[]): EnvStats {
  const temp = readings.map((r) => r.average_temperature);
  const noise = readings.map((r) => r.average_noise);
  return {
    packetCount: readings.length,
    avgTemperature: temp.length ? round(mean(temp), 1) : null,
    avgNoise: noise.length ? round(mean(noise), 1) : null,
    peakTemperature: temp.length ? round(max(temp) as number, 1) : null,
    lowestTemperature: temp.length ? round(min(temp) as number, 1) : null,
    peakNoise: noise.length ? round(max(noise) as number, 1) : null,
    lowestNoise: noise.length ? round(min(noise) as number, 1) : null,
    sumTemperature: temp.reduce((a, b) => a + b, 0),
    sumNoise: noise.reduce((a, b) => a + b, 0),
  };
}

async function fetchReadingPoints(recordingIds: string[]): Promise<Map<string, ReadingPoint[]>> {
  const byRecording = new Map<string, ReadingPoint[]>();
  if (recordingIds.length === 0) return byRecording;
  const { data, error } = await supabase
    .from('environmental_readings')
    .select('recording_id, average_temperature, average_noise')
    .in('recording_id', recordingIds);
  if (error) throw error;
  for (const r of (data ?? []) as ReadingPoint[]) {
    const list = byRecording.get(r.recording_id) ?? [];
    list.push(r);
    byRecording.set(r.recording_id, list);
  }
  return byRecording;
}

export interface RecordingDatasetRow extends EnvStats {
  recording: Recording;
  /** Assessment details that apply to this recording (own or its group's). */
  assessment: Assessment | null;
}

/**
 * Export-ready dataset of every non-archived recording (with or without
 * assessment details), including its group and assessment information.
 */
export async function fetchRecordingsDataset(dateRange?: DateRange): Promise<RecordingDatasetRow[]> {
  let query = supabase
    .from('recordings')
    .select('*, group:recording_groups(id, name, created_at)')
    .eq('is_archived', false)
    .order('started_at', { ascending: false });
  if (dateRange?.from) query = query.gte('started_at', dateRange.from);
  if (dateRange?.to) query = query.lte('started_at', `${dateRange.to}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  const recordings = (data ?? []) as Recording[];
  if (recordings.length === 0) return [];

  const ids = recordings.map((r) => r.id);
  const [readings, assessmentsRes] = await Promise.all([
    fetchReadingPoints(ids),
    supabase.from('assessments').select('*').eq('is_archived', false),
  ]);
  if (assessmentsRes.error) throw assessmentsRes.error;
  const assessments = (assessmentsRes.data ?? []) as Assessment[];

  return recordings.map((recording) => ({
    recording,
    assessment:
      assessments.find(
        (a) => a.recording_id === recording.id || (a.group_id && a.group_id === recording.group_id)
      ) ?? null,
    ...summarize(readings.get(recording.id) ?? []),
  }));
}

export interface AnalysisRow extends EnvStats {
  assessment: Assessment;
  /** Active recordings covered by this assessment (several for a group). */
  recordings: Recording[];
  /** Per-recording environmental summary, same order as `recordings`. */
  recordingStats: (EnvStats & { recording: Recording })[];
}

export interface AnalysisFilters {
  subject?: string;
  assessmentType?: string;
  groupType?: GroupType;
  assessmentNumber?: number;
  dateRange?: DateRange;
  /** Only assessments published to the Assessments page (default: all active). */
  publishedOnly?: boolean;
}

/**
 * Builds the dataset used across the Assessments and Statistical Analysis
 * pages: every active assessment paired with environmental readings pooled
 * across ALL recordings that belong to it, so a multi-day group counts once.
 */
export async function fetchAnalysisDataset(filters: AnalysisFilters = {}): Promise<AnalysisRow[]> {
  const active = await fetchActiveAssessments({
    subject: filters.subject,
    assessmentType: filters.assessmentType,
    groupType: filters.groupType,
    assessmentNumber: filters.assessmentNumber,
    dateFrom: filters.dateRange?.from,
    dateTo: filters.dateRange?.to,
    publishedOnly: filters.publishedOnly,
  });
  if (active.length === 0) return [];

  const readings = await fetchReadingPoints(
    Array.from(new Set(active.flatMap((a) => a.recordings.map((r) => r.id))))
  );

  return active.map(({ assessment, recordings }) => {
    const pooled = recordings.flatMap((r) => readings.get(r.id) ?? []);
    return {
      assessment,
      recordings,
      recordingStats: recordings.map((recording) => ({
        recording,
        ...summarize(readings.get(recording.id) ?? []),
      })),
      ...summarize(pooled),
    };
  });
}

/**
 * Pearson correlations (Temperature, Noise vs Score %) over the given rows.
 * Rows missing either value are skipped for that correlation.
 */
export function runPearsonCorrelations(rows: AnalysisRow[]): PearsonResult[] {
  const scored = rows.filter((r) => r.assessment.score_percentage !== null);
  const tempPairs = scored.filter((r) => r.avgTemperature !== null);
  const noisePairs = scored.filter((r) => r.avgNoise !== null);

  return [
    computePearson(
      'Temperature',
      'Score Percentage',
      tempPairs.map((r) => r.avgTemperature as number),
      tempPairs.map((r) => r.assessment.score_percentage as number)
    ),
    computePearson(
      'Noise Level',
      'Score Percentage',
      noisePairs.map((r) => r.avgNoise as number),
      noisePairs.map((r) => r.assessment.score_percentage as number)
    ),
  ];
}

/**
 * Independent-samples t-test per subject, Experimental vs Comparison.
 * Only assessments with a subject, group and score percentage take part.
 */
export function runTTestsBySubject(rows: AnalysisRow[]): TTestResult[] {
  const eligible = rows.filter(
    (r) => r.assessment.subject && r.assessment.group_type && r.assessment.score_percentage !== null
  );
  const subjects = Array.from(new Set(eligible.map((r) => r.assessment.subject as string))).sort();
  return subjects.map((subject) => {
    const subjectRows = eligible.filter((r) => r.assessment.subject === subject);
    const scores = (g: GroupType) =>
      subjectRows
        .filter((r) => r.assessment.group_type === g)
        .map((r) => r.assessment.score_percentage as number);
    return computeIndependentTTest(subject, scores('Experimental'), scores('Comparison'));
  });
}
