import type { DescriptiveStats, GroupObservation, PearsonResult, WelchTTestResult } from '../types';
import { round } from './calculations';

// ---------------------------------------------------------------------------
// Statistical helpers
// Results are always computed from the arrays passed in — never hardcoded.
// Callers are responsible for filtering out archived records before calling.
// ---------------------------------------------------------------------------

/** Regularized incomplete beta function (series/continued-fraction approx). */
function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-9;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(x, a, b)) / a;
  }
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Two-tailed p-value for Student's t distribution given t and degrees of freedom. */
export function tDistributionPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  const p = betai(df / 2, 0.5, x);
  return Math.min(1, Math.max(0, p));
}

/**
 * Pearson product-moment correlation coefficient between two equal-length arrays.
 */
export function pearsonCorrelation(x: number[], y: number[]): { r: number; n: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { r: 0, n };
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  const r = denom === 0 ? 0 : num / denom;
  return { r, n };
}

function interpretR(r: number): string {
  const abs = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';
  let strength: string;
  if (abs < 0.1) strength = 'negligible';
  else if (abs < 0.3) strength = 'weak';
  else if (abs < 0.5) strength = 'moderate';
  else if (abs < 0.7) strength = 'strong';
  else strength = 'very strong';
  return `${strength} ${direction}`;
}

/**
 * Computes Pearson correlation with significance test and a plain-language
 * interpretation, given the environmental variable label and paired values.
 */
export function computePearson(
  variableXLabel: string,
  variableYLabel: string,
  x: number[],
  y: number[],
  alpha = 0.05
): PearsonResult {
  const { r, n } = pearsonCorrelation(x, y);
  if (n < 3) {
    return {
      variableX: variableXLabel,
      variableY: variableYLabel,
      n,
      r: 0,
      pValue: 1,
      significant: false,
      interpretation: 'Insufficient data to compute a reliable correlation (n < 3).',
      rSquared: 0,
    };
  }
  const df = n - 2;
  const denom = Math.max(1e-12, 1 - r * r);
  const t = r * Math.sqrt(df / denom);
  const pValue = tDistributionPValue(t, df);
  const significant = pValue < alpha;
  const strengthPhrase = interpretR(r);
  const interpretation = `${variableXLabel} and ${variableYLabel} showed a ${strengthPhrase} correlation (r = ${round(
    r,
    3
  )}, ${significant ? 'statistically significant' : 'not statistically significant'} at α = ${alpha}).`;
  return {
    variableX: variableXLabel,
    variableY: variableYLabel,
    n,
    r: round(r, 4),
    pValue: round(pValue, 4),
    significant,
    interpretation,
    rSquared: round(r * r, 4),
  };
}

/** Least-squares line y = slope·x + intercept, or null when it cannot be fitted. */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } | null {
  const n = Math.min(x.length, y.length);
  if (n < 2) return null;
  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/** Two-tailed critical t value for the given degrees of freedom (found by bisection). */
export function tCritical(df: number, alpha = 0.05): number {
  if (df <= 0) return NaN;
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tDistributionPValue(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const sampleVariance = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = mean(v);
  return v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1);
};

/**
 * Welch's independent-samples t-test (unequal variances) comparing
 * Experimental and Comparison observations.
 *
 *   SE = √(s₁²/n₁ + s₂²/n₂)
 *   t  = (mean₁ − mean₂) ÷ SE
 *   df = (v₁ + v₂)² ÷ (v₁²/(n₁ − 1) + v₂²/(n₂ − 1)),  where vᵢ = sᵢ²/nᵢ
 */
export function computeWelchTTest(
  label: string,
  experimental: GroupObservation[],
  comparison: GroupObservation[],
  alpha = 0.05
): WelchTTestResult {
  const n1 = experimental.length;
  const n2 = comparison.length;
  const expValues = experimental.map((o) => o.score);
  const compValues = comparison.map((o) => o.score);
  const mean1 = mean(expValues);
  const mean2 = mean(compValues);
  const var1 = sampleVariance(expValues);
  const var2 = sampleVariance(compValues);
  const sd1 = Math.sqrt(var1);
  const sd2 = Math.sqrt(var2);
  const meanDiff = mean1 - mean2;

  const base = {
    label,
    nExperimental: n1,
    nComparison: n2,
    meanExperimental: round(mean1, 2),
    meanComparison: round(mean2, 2),
    sdExperimental: round(sd1, 2),
    sdComparison: round(sd2, 2),
    meanDifference: round(meanDiff, 2),
    experimentalScores: experimental,
    comparisonScores: comparison,
  };

  const notComputed = (interpretation: string, decision: string): WelchTTestResult => ({
    ...base,
    standardError: 0,
    tValue: 0,
    degreesOfFreedom: 0,
    pValue: 1,
    ciLower: 0,
    ciUpper: 0,
    effectSize: 0,
    significant: false,
    decision,
    interpretation,
  });

  if (n1 < 2 || n2 < 2) {
    return notComputed(
      "Insufficient data: Welch's t-test needs at least 2 Experimental and 2 Comparison assessments.",
      'Insufficient data'
    );
  }

  const v1 = var1 / n1;
  const v2 = var2 / n2;
  const se = Math.sqrt(v1 + v2);
  if (se === 0) {
    return notComputed(
      "Welch's t-test could not be computed because both groups have zero variability (all scores in each group are identical).",
      'Not computable'
    );
  }

  const df = (v1 + v2) ** 2 / ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));
  const tValue = meanDiff / se;
  const pValue = tDistributionPValue(Math.abs(tValue), df);
  const significant = pValue < alpha;
  const margin = tCritical(df, alpha) * se;
  const pooledSd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const effectSize = pooledSd === 0 ? 0 : meanDiff / pooledSd;

  const dfRounded = round(df, 2);
  const direction = meanDiff > 0 ? 'higher' : meanDiff < 0 ? 'lower' : 'equal';
  const stat = `t(${dfRounded}) = ${round(tValue, 3)}, p = ${round(pValue, 4)} ${significant ? '<' : '≥'} ${alpha}`;
  const interpretation = significant
    ? `Reject the null hypothesis. For ${label}, the Experimental group's scores (M = ${round(mean1, 2)}, n = ${n1}) were significantly ${direction} than the Comparison group's (M = ${round(mean2, 2)}, n = ${n2}) (${stat}).`
    : `Fail to reject the null hypothesis. For ${label}, there is no statistically significant difference between the Experimental (M = ${round(mean1, 2)}, n = ${n1}) and Comparison (M = ${round(mean2, 2)}, n = ${n2}) groups (${stat}).`;

  return {
    ...base,
    standardError: round(se, 3),
    tValue: round(tValue, 3),
    degreesOfFreedom: dfRounded,
    pValue: round(pValue, 4),
    ciLower: round(meanDiff - margin, 2),
    ciUpper: round(meanDiff + margin, 2),
    effectSize: round(effectSize, 3),
    significant,
    decision: significant ? 'Reject the null hypothesis' : 'Fail to reject the null hypothesis',
    interpretation,
  };
}

/**
 * Computes n, mean, median, standard deviation (sample), min, and max for a
 * set of values. Used by the Descriptive Statistics tab.
 */
export function computeDescriptiveStats(
  label: string,
  unit: string,
  values: number[]
): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    return { label, unit, n: 0, mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0 };
  }
  const avg = values.reduce((sum, v) => sum + v, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance =
    n > 1 ? values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (n - 1) : 0;
  const standardDeviation = Math.sqrt(variance);

  return {
    label,
    unit,
    n,
    mean: round(avg, 2),
    median: round(median, 2),
    standardDeviation: round(standardDeviation, 2),
    min: round(sorted[0], 2),
    max: round(sorted[n - 1], 2),
  };
}
