import type { EnvironmentalStatus } from '../types';

/**
 * Score Percentage = (Class Average Score / Total Possible Score) x 100
 * Rounded to 1 decimal place for display consistency.
 */
export function calculateScorePercentage(
  classAverageScore: number,
  totalPossibleScore: number
): number {
  if (!totalPossibleScore || totalPossibleScore <= 0) return 0;
  const pct = (classAverageScore / totalPossibleScore) * 100;
  return Math.round(pct * 10) / 10;
}

// ---------------------------------------------------------------------------
// Environmental classification — as specified by the study.
//
//   Temperature (°C)          Optimal  24 – 26
//                             Neutral  27 – 30
//                             Poor     below 24, or above 30
//
//   Acoustic noise (dBA)      Normal   <= 55
//                             Moderate 56 – 65
//                             High     > 65
//
// Ranges are written in WHOLE numbers and a reading is classified by its
// whole-number part, so 26.9 °C is still Optimal and 55.9 dBA is still Normal
// (the band only changes once the next whole number is reached).
//
// This file is the single source of truth: the Dashboard, tables, charts,
// classroom analysis, CSV exports, the Status Guide and System Settings all
// read from ENV_THRESHOLD_TABLE / the functions below.
// ---------------------------------------------------------------------------

/** Colour-level of a classification, independent of its wording. */
export type EnvLevel = 'good' | 'fair' | 'poor';

export const TEMPERATURE_LABELS: Record<EnvLevel, EnvironmentalStatus> = {
  good: 'Optimal',
  fair: 'Neutral',
  poor: 'Poor',
};

export const NOISE_LABELS: Record<EnvLevel, EnvironmentalStatus> = {
  good: 'Normal',
  fair: 'Moderate',
  poor: 'High',
};

/** Generic wording for combined (temperature + noise) classroom summaries. */
export const OVERALL_LABELS: Record<EnvLevel, EnvironmentalStatus> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export interface ThresholdRow {
  level: EnvLevel;
  label: EnvironmentalStatus;
  range: string;
  example?: string;
}

export interface ThresholdGroup {
  title: string;
  unit: string;
  rows: ThresholdRow[];
}

/** Human-readable ranges, used by the Status Guide and System Settings. */
export const ENV_THRESHOLD_TABLE: Record<'temperature' | 'noise', ThresholdGroup> = {
  temperature: {
    title: 'Temperature Range',
    unit: '°C',
    rows: [
      { level: 'good', label: 'Optimal', range: '24°C – 26°C' },
      { level: 'fair', label: 'Neutral', range: '27°C – 30°C' },
      { level: 'poor', label: 'Poor', range: 'Below 24°C or above 30°C' },
    ],
  },
  noise: {
    title: 'Acoustic Noise Level',
    unit: 'dBA',
    rows: [
      { level: 'good', label: 'Normal', range: '≤ 55 dBA' },
      { level: 'fair', label: 'Moderate', range: '56 – 65 dBA' },
      { level: 'poor', label: 'High', range: '> 65 dBA' },
    ],
  },
};

/**
 * Scale of the range gauges on the Dashboard / Live Monitoring cards. Each
 * segment runs up to `to`; the boundaries match the whole-number bands above.
 */
export interface GaugeConfig {
  min: number;
  max: number;
  segments: { to: number; level: EnvLevel }[];
}

export const ENV_GAUGE: Record<'temperature' | 'noise', GaugeConfig> = {
  temperature: {
    min: 18,
    max: 36,
    segments: [
      { to: 24, level: 'poor' },
      { to: 27, level: 'good' },
      { to: 31, level: 'fair' },
      { to: 36, level: 'poor' },
    ],
  },
  noise: {
    min: 35,
    max: 80,
    segments: [
      { to: 56, level: 'good' },
      { to: 66, level: 'fair' },
      { to: 80, level: 'poor' },
    ],
  },
};

/** Level of a temperature reading (whole-number band, so 26.9 → Optimal). */
export function getTemperatureLevel(temp: number | null | undefined): EnvLevel {
  if (temp === null || temp === undefined || Number.isNaN(temp)) return 'good';
  const whole = Math.floor(temp);
  if (whole >= 24 && whole <= 26) return 'good';
  if (whole >= 27 && whole <= 30) return 'fair';
  return 'poor';
}

/** Level of a noise reading (whole-number band, so 55.9 → Normal). */
export function getNoiseLevel(noise: number | null | undefined): EnvLevel {
  if (noise === null || noise === undefined || Number.isNaN(noise)) return 'good';
  const whole = Math.floor(noise);
  if (whole <= 55) return 'good';
  if (whole <= 65) return 'fair';
  return 'poor';
}

export function getTemperatureStatus(temp: number | null | undefined): EnvironmentalStatus {
  return TEMPERATURE_LABELS[getTemperatureLevel(temp)];
}

export function getNoiseStatus(noise: number | null | undefined): EnvironmentalStatus {
  return NOISE_LABELS[getNoiseLevel(noise)];
}

const LEVEL_RANK: Record<EnvLevel, number> = { good: 0, fair: 1, poor: 2 };

/** The worse of the temperature and noise levels. */
export function overallEnvironmentalLevel(
  temperature: number | null | undefined,
  noise: number | null | undefined
): EnvLevel {
  const t = getTemperatureLevel(temperature);
  const n = getNoiseLevel(noise);
  return LEVEL_RANK[t] >= LEVEL_RANK[n] ? t : n;
}

export function overallEnvironmentalStatus(
  temperature: number | null | undefined,
  noise: number | null | undefined
): EnvironmentalStatus {
  return OVERALL_LABELS[overallEnvironmentalLevel(temperature, noise)];
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function max(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function min(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.min(...values);
}

/**
 * Overall mean temperature / noise from ALL individual readings (not an
 * average of per-recording averages), so recordings with different numbers
 * of readings are weighted correctly.
 */
export function combinedMeans(readings: { average_temperature: number; average_noise: number }[]): {
  packets: number;
  avgTemperature: number | null;
  avgNoise: number | null;
} {
  if (readings.length === 0) return { packets: 0, avgTemperature: null, avgNoise: null };
  const t = readings.reduce((sum, r) => sum + r.average_temperature, 0) / readings.length;
  const n = readings.reduce((sum, r) => sum + r.average_noise, 0) / readings.length;
  return { packets: readings.length, avgTemperature: Math.round(t * 10) / 10, avgNoise: Math.round(n * 10) / 10 };
}
