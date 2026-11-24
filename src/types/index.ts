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

/** One assessment score observation belonging to the Experimental or Comparison group. */
export interface GroupObservation {
  /** e.g. "Mathematics · Quiz · #2 · Section A" */
  label: string;
  subject: string;
  assessmentType?: string | null;
  assessmentNumber?: number | null;
  section?: string | null;
  group: 'Experimental' | 'Comparison';
  score: number;
}

export interface WelchTTestResult {
  /** "Overall (All Subjects)" or the selected subject. */
  label: string;
  nExperimental: number;
  nComparison: number;
  meanExperimental: number;
  meanComparison: number;
  sdExperimental: number;
  sdComparison: number;
  /** meanExperimental − meanComparison */
  meanDifference: number;
  standardError: number;
  tValue: number;
  /** Welch–Satterthwaite degrees of freedom. */
  degreesOfFreedom: number;
  pValue: number;
  /** 95% confidence interval of the difference between group means. */
  ciLower: number;
  ciUpper: number;
  /** Cohen's d — standardized mean difference using pooled SD. */
  effectSize: number;
  significant: boolean;
  decision: string;
  interpretation: string;
  experimentalScores: GroupObservation[];
  comparisonScores: GroupObservation[];
}

export interface TTestResult {
  subject: string;
  nExperimental: number;
  nComparison: number;
  meanExperimental: number;
  meanComparison: number;
  tValue: number;
  degreesOfFreedom: number;
  pValue: number;
  significant: boolean;
  decision: string;
  interpretation: string;
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
