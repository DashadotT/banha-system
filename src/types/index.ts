export * from './database';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResult<T> {
  rows: T[];
  count: number;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface PearsonResult {
  variableX: string;
  variableY: string;
  n: number;
  r: number;
  pValue: number;
  significant: boolean;
  interpretation: string;
  /** Coefficient of determination (r²). */
  rSquared: number;
}

/** One matched Experimental / Comparison pair (same subject, assessment type and number). */
export interface PairedObservation {
  /** e.g. "Mathematics — Quiz #2" */
  label: string;
  subject: string;
  experimental: number;
  comparison: number;
  /** experimental − comparison */
  difference: number;
}

export interface PairedTTestResult {
  /** "Overall (All Subjects)" or the selected subject. */
  label: string;
  /** Number of matched pairs (the sample size n of the test). */
  nPairs: number;
  /** Experimental / Comparison assessments that had no partner and were left out. */
  unmatched: number;
  meanExperimental: number;
  meanComparison: number;
  sdExperimental: number;
  sdComparison: number;
  meanDifference: number;
  sdDifference: number;
  standardError: number;
  tValue: number;
  degreesOfFreedom: number;
  pValue: number;
  /** 95% confidence interval of the mean difference. */
  ciLower: number;
  ciUpper: number;
  /** Cohen's dz — mean difference ÷ SD of the differences. */
  effectSize: number;
  significant: boolean;
  decision: string;
  interpretation: string;
  pairs: PairedObservation[];
}

export interface DescriptiveStats {
  label: string;
  unit: string;
  n: number;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
}
