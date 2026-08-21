export function calculatePercentage(score: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
}

export function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateCO2Status(co2: number): 'Normal' | 'Moderate' | 'Poor' {
    if (co2 > 1000) return 'Poor';
    if (co2 > 700) return 'Moderate';
    return 'Normal';
}

export function calculateTemperatureStatus(temp: number): 'Normal' | 'Moderate' {
    if (temp > 28) return 'Moderate';
    return 'Normal';
}

export function calculateNoiseStatus(noise: number): 'Normal' | 'Moderate' | 'Poor' {
    if (noise > 60) return 'Poor';
    if (noise > 45) return 'Moderate';
    return 'Normal';
}