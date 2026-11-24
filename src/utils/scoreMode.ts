import type { Assessment } from '../types';

/**
 * Which score the Assessments table and Statistical Analysis use:
 *  percentage – Score Percentage (class average ÷ total possible score × 100)
 *  average    – the class's Average Score exactly as it was entered
 */
export type ScoreMode = 'percentage' | 'average';

export const DEFAULT_SCORE_MODE: ScoreMode = 'percentage';

export interface ScoreModeMeta {
  /** Full name, e.g. in table headers and report text. */
  label: string;
  /** Short name for narrow headers and chart axes. */
  short: string;
  /** Unit shown after a value ('%' for percentages, 'pts' for raw scores). */
  unit: string;
}

export const SCORE_MODE_META: Record<ScoreMode, ScoreModeMeta> = {
  percentage: { label: 'Score Percentage', short: 'Score %', unit: '%' },
  average: { label: 'Average Score', short: 'Avg Score', unit: 'pts' },
};

export function isScoreMode(value: unknown): value is ScoreMode {
  return value === 'percentage' || value === 'average';
}

type ScoreFields = Pick<Assessment, 'score_percentage' | 'class_average_score'>;

/** The numeric score used for analysis under the chosen mode (null when not entered). */
export function getScoreValue(a: ScoreFields, mode: ScoreMode): number | null {
  return mode === 'percentage' ? a.score_percentage : a.class_average_score;
}

/** Display text for a score value, e.g. "85.5%" or "42.5". */
export function formatScoreValue(value: number | null, mode: ScoreMode): string {
  if (value === null || value === undefined) return '—';
  return mode === 'percentage' ? `${value}%` : String(value);
}
