import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatDateShort } from '../../utils/dateTime';
import type { AnalysisRow } from '../../services/analysisService';

export function PeakRangeChart({
    rows,
    metric,
    unit,
    color,
    height = 280,
}: {
    rows: AnalysisRow[];
    metric: 'temperature' | 'noise';
    unit: string;
    color: string;
    height?: number;
}) {
    const peakKey = metric === 'temperature' ? 'peakTemperature' : 'peakNoise';
    const lowestKey = metric === 'temperature' ? 'lowestTemperature' : 'lowestNoise';

    const data = rows
        .filter((r) => r[peakKey] !== null)
        .map((r) => ({
            label: `${formatDateShort(r.assessment.assessment_date)} · ${r.assessment.assessment_type} #${r.assessment.assessment_number}`,
            Lowest: r[lowestKey],
            Highest: r[peakKey],
        }));

    if (data.length === 0) {
        return <p className="py-10 text-center text-sm text-slate-400">No readings available for this selection.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#E2E6EC' }}
                    tickLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                    formatter={(value) => [`${value} ${unit}`, '']}
                    contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #E2E6EC',
                        fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Lowest" fill="#B9CBE5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Highest" fill={color} radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}