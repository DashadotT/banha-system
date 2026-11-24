import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { fitDomain } from '../../utils/chartScale';

interface ScatterPoint {
  x: number;
  y: number;
}

interface TrendPoint extends ScatterPoint {
  trend: true;
}

/**
 * Scatter plot of one environmental variable (x) against the chosen score (y),
 * with the least-squares trend line drawn through the points.
 */
export function CorrelationScatter({
  data,
  xLabel,
  yLabel,
  color,
  trend,
  xUnit = '',
  yUnit = '',
  xMinSpan = 1,
  height = 260,
}: {
  data: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  color: string;
  trend?: { slope: number; intercept: number } | null;
  xUnit?: string;
  yUnit?: string;
  xMinSpan?: number;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No paired data available for this plot.</p>;
  }

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const xFit = fitDomain(xs, xMinSpan);
  const yFit = fitDomain(ys, 5);
  const trendPoints: TrendPoint[] =
    trend && data.length > 1
      ? [Math.min(...xs), Math.max(...xs)].map((x) => ({ x, y: trend.slope * x + trend.intercept, trend: true as const }))
      : [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          domain={xFit.domain}
          ticks={xFit.ticks}
          allowDataOverflow
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          label={{ value: `${xLabel}${xUnit ? ` (${xUnit})` : ''}`, position: 'insideBottom', offset: -12, fontSize: 11, fill: '#64748b' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          domain={yFit.domain}
          ticks={yFit.ticks}
          allowDataOverflow
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={44}
          label={{ value: `${yLabel}${yUnit ? ` (${yUnit})` : ''}`, angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11, fill: '#64748b', textAnchor: 'middle' } }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as (ScatterPoint & { trend?: boolean }) | undefined;
            if (!active || !p || p.trend) return null;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-card">
                <p className="text-slate-600">
                  {xLabel}: <span className="mono-num font-semibold text-primary">{p.x} {xUnit}</span>
                </p>
                <p className="text-slate-600">
                  {yLabel}: <span className="mono-num font-semibold text-primary">{p.y} {yUnit}</span>
                </p>
              </div>
            );
          }}
        />
        <Scatter data={data} fill={color} isAnimationActive={false} />
        {trendPoints.length > 0 && (
          <Line
            data={trendPoints}
            dataKey="y"
            type="linear"
            stroke="#002858"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            legendType="none"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
