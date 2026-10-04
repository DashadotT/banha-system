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
// Environmental status thresholds — as specified by the study:
//   Temperature (°C):  Normal 20-26,    Moderate 27-29,    Poor > 29
//   Noise (dBA):       Normal 35-55,    Moderate 56-65,    Poor > 65
//
// Readings below the stated "Normal" floor (e.g. a very quiet or cool room)
// are also treated as Normal, since the study only defines an escalation
// path on the high side — adjust the lower bounds below if that's not right.
// ---------------------------------------------------------------------------

export function getTemperatureStatus(temp: number | null | undefined): EnvironmentalStatus {
  if (temp === null || temp === undefined) return 'Normal';
  if (temp <= 26) return 'Normal';
  if (temp <= 29) return 'Moderate';
  return 'Poor';
}

export function getNoiseStatus(noise: number | null | undefined): EnvironmentalStatus {
  if (noise === null || noise === undefined) return 'Normal';
  if (noise <= 55) return 'Normal';
  if (noise <= 65) return 'Moderate';
  return 'Poor';
}

export function overallEnvironmentalStatus(
  temperature: number | null | undefined,
  noise: number | null | undefined
): EnvironmentalStatus {
  const statuses = [getTemperatureStatus(temperature), getNoiseStatus(noise)];
  if (statuses.includes('Poor')) return 'Poor';
  if (statuses.includes('Moderate')) return 'Moderate';
  return 'Normal';
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
