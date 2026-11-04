import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fitDomain } from '../../utils/chartScale';
import type { EnvironmentalStatus } from '../../types';

const STATUS_COLOR: Record<EnvironmentalStatus, string> = {
  Normal: '#10B981',
  Moderate: '#F59E0B',
  Poor: '#F43F5E',
};

export interface MetricBarDatum {
  label: string;
  value: number;
  n: number;
  status: EnvironmentalStatus;
}

/** Bars coloured by the study's Normal / Moderate / Poor ranges. Bars start at zero. */
export function MetricBarChart({
  data,
  unit,
  height = 260,
}: {
  data: MetricBarDatum[];
  unit: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No data available for this selection.</p>;
  }
  const top = fitDomain([0, ...data.map((d) => d.value)], 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          interval={0}
          angle={data.length > 4 ? -25 : 0}
          textAnchor={data.length > 4 ? 'end' : 'middle'}
          height={data.length > 4 ? 56 : 30}
        />
        <YAxis
          domain={[0, top.domain[1]]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={44}
          label={{ value: unit, angle: -90, position: 'insideLeft', offset: 14, style: { fontSize: 11, fill: '#94a3b8', textAnchor: 'middle' } }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(103,142,196,0.08)' }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as MetricBarDatum | undefined;
            if (!active || !d) return null;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-card">
                <p className="font-semibold text-primary">{d.label}</p>
                <p className="mt-0.5 text-slate-600">
                  <span className="mono-num font-semibold">{d.value.toFixed(1)} {unit}</span> · {d.status} range
                </p>
                <p className="text-slate-400">{d.n} assessment{d.n === 1 ? '' : 's'}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={STATUS_COLOR[d.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
