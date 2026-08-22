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
