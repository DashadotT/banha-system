export function pearsonCorrelation(x: number[], y: number[]): { r: number; p_value: number; n: number } {
    const n = x.length;
    if (n < 2 || x.length !== y.length) return { r: 0, p_value: 1, n };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return { r: 0, p_value: 1, n };

    const r = numerator / denominator;
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const p_value = 2 * (1 - studentTDistribution(Math.abs(t), n - 2));

    return { r, p_value, n };
}

function studentTDistribution(t: number, df: number): number {
    if (df > 30) {
        return 0.5 * (1 + erf(t / Math.sqrt(2)));
    }
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
}

function erf(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z);

    const t = 1 / (1 + p * z);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    return sign * y;
}

export function independentTTest(
    group1: number[],
    group2: number[]
): { t: number; df: number; p_value: number; mean1: number; mean2: number; n1: number; n2: number } {
    const n1 = group1.length;
    const n2 = group2.length;

    if (n1 < 2 || n2 < 2) return { t: 0, df: 0, p_value: 1, mean1: 0, mean2: 0, n1, n2 };

    const mean1 = group1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = group2.reduce((a, b) => a + b, 0) / n2;

    const var1 = group1.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1);
    const var2 = group2.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1);

    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const t = (mean1 - mean2) / Math.sqrt(pooledVar * (1 / n1 + 1 / n2));

    const df = n1 + n2 - 2;
    const p_value = 2 * (1 - studentTDistribution(Math.abs(t), df));

    return { t, df, p_value, mean1, mean2, n1, n2 };
}

export function getSignificance(p: number): 'significant' | 'not significant' {
    return p < 0.05 ? 'significant' : 'not significant';
}

export function getCorrelationInterpretation(r: number, p: number): string {
    const absR = Math.abs(r);
    let strength = '';
    if (absR >= 0.8) strength = 'strong';
    else if (absR >= 0.5) strength = 'moderate';
    else if (absR >= 0.3) strength = 'weak';
    else strength = 'very weak';

    const direction = r >= 0 ? 'positive' : 'negative';
    const sig = p < 0.05 ? 'statistically significant' : 'not statistically significant';

    return `${strength} ${direction} correlation (${sig})`;
}

export function getTTestInterpretation(p: number, mean1: number, mean2: number): string {
    const sig = p < 0.05;
    const diff = mean1 - mean2;
    const direction = diff > 0 ? 'higher' : 'lower';
    if (sig) {
        return `Reject the null hypothesis. There is a statistically significant difference between the Experimental (${mean1.toFixed(1)}) and Comparison (${mean2.toFixed(1)}) groups. The experimental group scored ${direction}.`;
    }
    return `Fail to reject the null hypothesis. There is no statistically significant difference between the Experimental (${mean1.toFixed(1)}) and Comparison (${mean2.toFixed(1)}) groups.`;
}