import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ScatterPoint {
  x: number;
  y: number;
}

export function CorrelationScatter({
  data,
  xLabel,
  yLabel = 'Score %',
  color,
  height = 260,
}: {
  data: ScatterPoint[];
  xLabel: string;
  yLabel?: string;
  color: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          label={{ value: xLabel, position: 'insideBottom', offset: -4, fontSize: 11, fill: '#64748b' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={40}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E6EC',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
          }}
        />
        <Scatter data={data} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
