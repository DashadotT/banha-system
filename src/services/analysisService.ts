import { supabase } from './supabase';
import { computePearson, computeWelchTTest } from '../utils/statistics';
import { SCORE_MODE_META, getScoreValue, type ScoreMode } from '../utils/scoreMode';
import { max, mean, min, round } from '../utils/calculations';
import { fetchActiveAssessments } from './assessmentService';
import type {
  Assessment,
  DateRange,
  GroupObservation,
  GroupType,
  PearsonResult,
  Recording,
  WelchTTestResult,
} from '../types';

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

/** Rows that have a score under the chosen score mode. */
export function scoredRows(rows: AnalysisRow[], mode: ScoreMode): AnalysisRow[] {
  return rows.filter((r) => getScoreValue(r.assessment, mode) !== null);
}

/**
 * Pearson correlations (Temperature, Noise vs the chosen score) over the
 * given rows. Rows missing either value are skipped for that correlation.
 */
export function runPearsonCorrelations(rows: AnalysisRow[], mode: ScoreMode): PearsonResult[] {
  const scoreLabel = SCORE_MODE_META[mode].label;
  const scored = scoredRows(rows, mode);
  const tempPairs = scored.filter((r) => r.avgTemperature !== null);
  const noisePairs = scored.filter((r) => r.avgNoise !== null);
  const score = (r: AnalysisRow) => getScoreValue(r.assessment, mode) as number;

  return [
    computePearson('Temperature', scoreLabel, tempPairs.map((r) => r.avgTemperature as number), tempPairs.map(score)),
    computePearson('Noise Level', scoreLabel, noisePairs.map((r) => r.avgNoise as number), noisePairs.map(score)),
  ];
}

/**
 * Collects scored Experimental and Comparison assessments from the filtered
 * dataset and runs Welch's independent-samples t-test. With "All subjects"
 * selected every eligible assessment goes into one overall test; with a single
 * subject selected it is that subject's result.
 */
export function runWelchTTest(rows: AnalysisRow[], mode: ScoreMode, subject?: string): WelchTTestResult {
  const experimental: GroupObservation[] = [];
  const comparison: GroupObservation[] = [];

  for (const r of scoredRows(rows, mode)) {
    const a = r.assessment;
    if (a.group_type !== 'Experimental' && a.group_type !== 'Comparison') continue;
    const score = getScoreValue(a, mode) as number;
    const parts = [
      a.subject,
      a.assessment_type,
      a.assessment_number !== null ? `#${a.assessment_number}` : null,
      a.section,
    ].filter(Boolean);
    const obs: GroupObservation = {
      label: parts.length > 0 ? parts.join(' · ') : 'Assessment',
      subject: a.subject ?? 'Unspecified',
      assessmentType: a.assessment_type,
      assessmentNumber: a.assessment_number,
      section: a.section,
      group: a.group_type,
      score,
    };
    if (a.group_type === 'Experimental') experimental.push(obs);
    else comparison.push(obs);
  }

  return computeWelchTTest(subject ? subject : 'Overall (All Subjects)', experimental, comparison);
}
