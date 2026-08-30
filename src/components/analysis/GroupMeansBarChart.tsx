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
import type { TTestResult } from '../../types';

export function GroupMeansBarChart({ results, height = 280 }: { results: TTestResult[]; height?: number }) {
  const data = results.map((r) => ({
    subject: r.subject,
    Experimental: r.meanExperimental,
    Comparison: r.meanComparison,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => [`${value}%`, '']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E6EC',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Experimental" fill="#DEAE20" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Comparison" fill="#678EC4" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
