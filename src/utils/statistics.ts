import type { PearsonResult, TTestResult } from '../types';
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
  };
}

/**
 * Independent-samples (Welch's) t-test between two groups.
 */
export function computeIndependentTTest(
  subject: string,
  experimental: number[],
  comparison: number[],
  alpha = 0.05
): TTestResult {
  const n1 = experimental.length;
  const n2 = comparison.length;
  const mean1 = n1 ? experimental.reduce((a, b) => a + b, 0) / n1 : 0;
  const mean2 = n2 ? comparison.reduce((a, b) => a + b, 0) / n2 : 0;

  if (n1 < 2 || n2 < 2) {
    return {
      subject,
      nExperimental: n1,
      nComparison: n2,
      meanExperimental: round(mean1, 2),
      meanComparison: round(mean2, 2),
      tValue: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      significant: false,
      decision: 'Insufficient data',
      interpretation:
        'Insufficient sample size in one or both groups to compute a t-test (need at least 2 per group).',
    };
  }

  const var1 = experimental.reduce((sum, v) => sum + (v - mean1) ** 2, 0) / (n1 - 1);
  const var2 = comparison.reduce((sum, v) => sum + (v - mean2) ** 2, 0) / (n2 - 1);

  const se = Math.sqrt(var1 / n1 + var2 / n2);
  const tValue = se === 0 ? 0 : (mean1 - mean2) / se;

  // Welch–Satterthwaite degrees of freedom
  const dfNumerator = (var1 / n1 + var2 / n2) ** 2;
  const dfDenominator =
    (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1) || 1;
  const df = dfDenominator === 0 ? n1 + n2 - 2 : dfNumerator / dfDenominator;

  const pValue = tDistributionPValue(Math.abs(tValue), df);
  const significant = pValue < alpha;

  const decision = significant ? 'Reject the null hypothesis' : 'Fail to reject the null hypothesis';
  const interpretation = significant
    ? `Reject the null hypothesis. There is a statistically significant difference between the Experimental and Comparison groups for ${subject} (t(${round(
        df,
        2
      )}) = ${round(tValue, 3)}, p = ${round(pValue, 4)} < ${alpha}).`
    : `Fail to reject the null hypothesis. There is no statistically significant difference between the Experimental and Comparison groups for ${subject} (t(${round(
        df,
        2
      )}) = ${round(tValue, 3)}, p = ${round(pValue, 4)} ≥ ${alpha}).`;

  return {
    subject,
    nExperimental: n1,
    nComparison: n2,
    meanExperimental: round(mean1, 2),
    meanComparison: round(mean2, 2),
    tValue: round(tValue, 3),
    degreesOfFreedom: round(df, 2),
    pValue: round(pValue, 4),
    significant,
    decision,
    interpretation,
  };
}
