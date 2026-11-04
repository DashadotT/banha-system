import { overallEnvironmentalStatus, round } from './calculations';
import type { AnalysisRow } from '../services/analysisService';
import type { EnvironmentalStatus, Recording } from '../types';

export interface ConditionSummary {
  label: string;
  /** Assessments contributing (an assessment counts once per classroom / schedule it was held in). */
  assessments: number;
  recordings: number;
  avgTemperature: number | null;
  avgNoise: number | null;
  /** Share (0–1) of observations whose overall status was Moderate or Poor. */
  nonNormalShare: number;
  moderateCount: number;
  poorCount: number;
  status: EnvironmentalStatus;
}

/** Minimum assessments before a classroom can be flagged as "frequently" poor. */
export const MIN_ASSESSMENTS_FOR_FLAG = 2;
/** Share of assessments in Moderate/Poor at/above which a classroom is flagged. */
export const FLAG_SHARE = 0.5;

/** One assessment's readings in one classroom / schedule, pooled from raw readings. */
interface Observation {
  avgTemperature: number | null;
  avgNoise: number | null;
  recordings: number;
}

/**
 * Classroom and schedule belong to each recording, so one assessment can
 * contribute to several classrooms. Within an assessment, recordings in the
 * same place are pooled using exact sums of their readings (never an average
 * of averages).
 */
function observations(rows: AnalysisRow[], key: (r: Recording) => string | null): Map<string, Observation[]> {
  const out = new Map<string, Observation[]>();
  for (const row of rows) {
    const buckets = new Map<string, typeof row.recordingStats>();
    for (const rs of row.recordingStats) {
      const k = key(rs.recording);
      if (k) buckets.set(k, [...(buckets.get(k) ?? []), rs]);
    }
    for (const [label, list] of buckets) {
      const packets = list.reduce((n, s) => n + s.packetCount, 0);
      const obs: Observation = {
        avgTemperature: packets ? round(list.reduce((n, s) => n + s.sumTemperature, 0) / packets, 1) : null,
        avgNoise: packets ? round(list.reduce((n, s) => n + s.sumNoise, 0) / packets, 1) : null,
        recordings: list.length,
      };
      out.set(label, [...(out.get(label) ?? []), obs]);
    }
  }
  return out;
}

function summarize(label: string, list: Observation[]): ConditionSummary {
  const measured = list.filter((o) => o.avgTemperature !== null || o.avgNoise !== null);
  const temps = list.filter((o) => o.avgTemperature !== null).map((o) => o.avgTemperature as number);
  const noises = list.filter((o) => o.avgNoise !== null).map((o) => o.avgNoise as number);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const avgTemperature = temps.length ? round(mean(temps), 1) : null;
  const avgNoise = noises.length ? round(mean(noises), 1) : null;

  let moderate = 0;
  let poor = 0;
  for (const o of measured) {
    const s = overallEnvironmentalStatus(o.avgTemperature, o.avgNoise);
    if (s === 'Moderate') moderate += 1;
    if (s === 'Poor') poor += 1;
  }
  return {
    label,
    assessments: list.length,
    recordings: list.reduce((n, o) => n + o.recordings, 0),
    avgTemperature,
    avgNoise,
    nonNormalShare: measured.length ? (moderate + poor) / measured.length : 0,
    moderateCount: moderate,
    poorCount: poor,
    status: overallEnvironmentalStatus(avgTemperature, avgNoise),
  };
}

const toSummaries = (map: Map<string, Observation[]>) =>
  [...map.entries()].map(([label, list]) => summarize(label, list)).sort((a, b) => a.label.localeCompare(b.label));

export const byClassroom = (rows: AnalysisRow[]) => toSummaries(observations(rows, (r) => r.classroom_type));
export const bySchedule = (rows: AnalysisRow[]) => toSummaries(observations(rows, (r) => r.class_schedule));

export function isFlagged(s: ConditionSummary): boolean {
  return s.assessments >= MIN_ASSESSMENTS_FOR_FLAG && s.nonNormalShare >= FLAG_SHARE;
}

export interface MatrixCell extends ConditionSummary {
  classroom: string;
  schedule: string;
}

/** Classroom × schedule combinations that actually have data. */
export function classroomScheduleMatrix(rows: AnalysisRow[]): {
  classrooms: string[];
  schedules: string[];
  cells: Map<string, MatrixCell>;
} {
  const both = (r: Recording) => (r.classroom_type && r.class_schedule ? `${r.classroom_type}||${r.class_schedule}` : null);
  const map = observations(rows, both);
  const cells = new Map<string, MatrixCell>();
  const classrooms = new Set<string>();
  const schedules = new Set<string>();
  for (const [k, list] of map) {
    const [classroom, schedule] = k.split('||');
    classrooms.add(classroom);
    schedules.add(schedule);
    cells.set(k, { ...summarize(`${classroom} · ${schedule}`, list), classroom, schedule });
  }
  return { classrooms: [...classrooms].sort(), schedules: [...schedules].sort(), cells };
}
