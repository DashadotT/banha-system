import { supabase } from './supabase';
import { Assessment, CorrelationResult, TTestResult } from '../types';
import { pearsonCorrelation, independentTTest, getSignificance, getCorrelationInterpretation, getTTestInterpretation } from '../utils/statistics';

export async function getDataForAnalysis(
    subject?: string,
    assessmentType?: string,
    assessmentName?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<Assessment[]> {
    try {
        let query = supabase
            .from('assessments')
            .select(`
        *,
        recording:recordings(
          *,
          device:devices(*),
          readings:environmental_readings(*)
        )
      `)
            .eq('is_archived', false);

        if (subject) query = query.eq('subject', subject);
        if (assessmentType) query = query.eq('assessment_type', assessmentType);
        if (assessmentName) query = query.eq('assessment_name', assessmentName);
        if (dateFrom) query = query.gte('assessment_date', dateFrom);
        if (dateTo) query = query.lte('assessment_date', dateTo);

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching data for analysis:', error);
            throw error;
        }
        return data || [];
    } catch (err) {
        console.error('Error in getDataForAnalysis:', err);
        return [];
    }
}

export function calculateCorrelations(assessments: Assessment[]): CorrelationResult[] {
    if (assessments.length < 3) {
        return [];
    }

    const scores = assessments.map(a => a.score_percentage);

    // Calculate averages for each assessment
    const co2Values: number[] = [];
    const tempValues: number[] = [];
    const noiseValues: number[] = [];

    assessments.forEach(a => {
        const rec = a.recording as any;
        const readings = rec?.readings || [];
        if (readings.length > 0) {
            const avgCO2 = readings.reduce((sum: number, r: any) => sum + r.average_co2, 0) / readings.length;
            const avgTemp = readings.reduce((sum: number, r: any) => sum + r.average_temperature, 0) / readings.length;
            const avgNoise = readings.reduce((sum: number, r: any) => sum + r.average_noise, 0) / readings.length;
            co2Values.push(avgCO2);
            tempValues.push(avgTemp);
            noiseValues.push(avgNoise);
        }
    });

    const results: CorrelationResult[] = [];

    // Only calculate if we have enough data
    if (co2Values.length >= 3 && scores.length >= 3) {
        const validIndices = co2Values.map((_, i) => i).filter(i => co2Values[i] > 0 && scores[i] > 0);
        if (validIndices.length >= 3) {
            const x = validIndices.map(i => co2Values[i]);
            const y = validIndices.map(i => scores[i]);
            const { r, p_value, n } = pearsonCorrelation(x, y);
            results.push({
                variable1: 'CO₂',
                variable2: 'Score Percentage',
                n,
                r,
                p_value,
                significance: getSignificance(p_value),
                interpretation: getCorrelationInterpretation(r, p_value),
            });
        }
    }

    if (tempValues.length >= 3 && scores.length >= 3) {
        const validIndices = tempValues.map((_, i) => i).filter(i => tempValues[i] > 0 && scores[i] > 0);
        if (validIndices.length >= 3) {
            const x = validIndices.map(i => tempValues[i]);
            const y = validIndices.map(i => scores[i]);
            const { r, p_value, n } = pearsonCorrelation(x, y);
            results.push({
                variable1: 'Temperature',
                variable2: 'Score Percentage',
                n,
                r,
                p_value,
                significance: getSignificance(p_value),
                interpretation: getCorrelationInterpretation(r, p_value),
            });
        }
    }

    if (noiseValues.length >= 3 && scores.length >= 3) {
        const validIndices = noiseValues.map((_, i) => i).filter(i => noiseValues[i] > 0 && scores[i] > 0);
        if (validIndices.length >= 3) {
            const x = validIndices.map(i => noiseValues[i]);
            const y = validIndices.map(i => scores[i]);
            const { r, p_value, n } = pearsonCorrelation(x, y);
            results.push({
                variable1: 'Noise',
                variable2: 'Score Percentage',
                n,
                r,
                p_value,
                significance: getSignificance(p_value),
                interpretation: getCorrelationInterpretation(r, p_value),
            });
        }
    }

    return results;
}

export function calculateTTest(
    assessments: Assessment[],
    subject: string
): TTestResult | null {
    try {
        const filtered = assessments.filter(a => a.subject === subject);
        if (filtered.length < 4) return null;

        const experimental = filtered
            .filter(a => a.group_type === 'Experimental')
            .map(a => a.score_percentage);

        const comparison = filtered
            .filter(a => a.group_type === 'Comparison')
            .map(a => a.score_percentage);

        if (experimental.length < 2 || comparison.length < 2) return null;

        const result = independentTTest(experimental, comparison);
        const sig = getSignificance(result.p_value);

        return {
            subject,
            experimental_n: result.n1,
            comparison_n: result.n2,
            experimental_mean: result.mean1,
            comparison_mean: result.mean2,
            t_value: result.t,
            df: result.df,
            p_value: result.p_value,
            significance: sig,
            decision: sig === 'significant'
                ? 'Reject the null hypothesis'
                : 'Fail to reject the null hypothesis',
            interpretation: getTTestInterpretation(result.p_value, result.mean1, result.mean2),
        };
    } catch (err) {
        console.error('Error calculating t-test:', err);
        return null;
    }
}