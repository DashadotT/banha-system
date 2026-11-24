import { overallEnvironmentalLevel, round } from './calculations';
import type { EnvLevel } from './calculations';
import type { AnalysisRow } from '../services/analysisService';
import type { Recording } from '../types';

export interface ConditionSummary {
  label: string;
  /** Assessments contributing (an assessment counts once per classroom / schedule it was held in). */
  assessments: number;
  recordings: number;
  avgTemperature: number | null;
  avgNoise: number | null;
  /** Share (0–1) of observations whose overall level was Fair or Poor. */
  nonNormalShare: number;
  /** Observations whose combined temperature/noise level was Fair. */
  fairCount: number;
  poorCount: number;
  level: EnvLevel;
}

/** Minimum assessments before a classroom can be flagged as "frequently" poor. */
export const MIN_ASSESSMENTS_FOR_FLAG = 2;
/** Share of assessments in Fair/Poor at/above which a classroom is flagged. */
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

  let fair = 0;
  let poor = 0;
  for (const o of measured) {
    const l = overallEnvironmentalLevel(o.avgTemperature, o.avgNoise);
    if (l === 'fair') fair += 1;
    if (l === 'poor') poor += 1;
  }
  return {
    label,
    assessments: list.length,
    recordings: list.reduce((n, o) => n + o.recordings, 0),
    avgTemperature,
    avgNoise,
    nonNormalShare: measured.length ? (fair + poor) / measured.length : 0,
    fairCount: fair,
    poorCount: poor,
    level: overallEnvironmentalLevel(avgTemperature, avgNoise),
  };
}

const DAY_ORDER: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

const PERIOD_MINUTES: [RegExp, number][] = [
  [/\bmorning\b/i, 8 * 60],
  [/\bnoon\b|\bmidday\b/i, 12 * 60],
  [/\bafternoon\b/i, 14 * 60],
  [/\bevening\b|\bnight\b/i, 18 * 60],
];

/** Extracts the start time in minutes since midnight from a schedule label, if present. */
function scheduleStartMinutes(label: string): number | null {
  const matches = [...label.matchAll(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/gi)];
  if (matches.length > 0) {
    let hour = parseInt(matches[0][1], 10);
    const minute = parseInt(matches[0][2], 10);
    let meridiem = matches[0][3]?.toUpperCase();

    if (!meridiem && matches.length > 1) {
      const endHour = parseInt(matches[1][1], 10);
      const endMeridiem = matches[1][3]?.toUpperCase();
      if (endMeridiem === 'AM') {
        meridiem = 'AM';
      } else if (endMeridiem === 'PM') {
        // e.g. "11:30–1:00 PM" starts in AM, whereas "1:00–2:30 PM" starts in PM.
        meridiem = hour >= 7 && hour <= 11 && endHour < hour ? 'AM' : 'PM';
      }
    }

    if (meridiem === 'AM') {
      if (hour === 12) hour = 0;
    } else if (meridiem === 'PM') {
      if (hour < 12) hour += 12;
    }
    return hour * 60 + minute;
  }

  for (const [pattern, mins] of PERIOD_MINUTES) {
    if (pattern.test(label)) return mins;
  }
  return null;
}

function scheduleDayOrder(label: string): number {
  const m = label.match(/\b(mon|tue|wed|thu|fri|sat|sun)\b/i);
  return m ? DAY_ORDER[m[1].toLowerCase()] : 99;
}

/** Sorts class schedules chronologically by start time, then day/name. */
export function compareSchedules(a: string, b: string): number {
  const timeA = scheduleStartMinutes(a);
  const timeB = scheduleStartMinutes(b);
  if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
  if (timeA !== null && timeB === null) return -1;
  if (timeA === null && timeB !== null) return 1;
  const dayDiff = scheduleDayOrder(a) - scheduleDayOrder(b);
  if (dayDiff !== 0) return dayDiff;
  return a.localeCompare(b, undefined, { numeric: true });
}

const toSummaries = (map: Map<string, Observation[]>, sortLabels: (a: string, b: string) => number) =>
  [...map.entries()].map(([label, list]) => summarize(label, list)).sort((a, b) => sortLabels(a.label, b.label));

export const byClassroom = (rows: AnalysisRow[]) =>
  toSummaries(observations(rows, (r) => r.classroom_type), (a, b) => a.localeCompare(b, undefined, { numeric: true }));
export const bySchedule = (rows: AnalysisRow[]) =>
  toSummaries(observations(rows, (r) => r.class_schedule), compareSchedules);

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
  return {
    classrooms: [...classrooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    schedules: [...schedules].sort(compareSchedules),
    cells,
  };
}
