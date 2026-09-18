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
// Environmental status thresholds
// Based on common ASHRAE / WHO classroom guidance:
//   Temperature (C): Normal 20-26,   Moderate 26-30 or 18-20, Poor otherwise
//   Noise (dB):      Normal < 55,    Moderate 55-70,       Poor > 70
// ---------------------------------------------------------------------------

export function getTemperatureStatus(temp: number | null | undefined): EnvironmentalStatus {
  if (temp === null || temp === undefined) return 'Normal';
  if (temp >= 20 && temp <= 26) return 'Normal';
  if ((temp >= 18 && temp < 20) || (temp > 26 && temp <= 30)) return 'Moderate';
  return 'Poor';
}

export function getNoiseStatus(noise: number | null | undefined): EnvironmentalStatus {
  if (noise === null || noise === undefined) return 'Normal';
  if (noise < 55) return 'Normal';
  if (noise <= 70) return 'Moderate';
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
