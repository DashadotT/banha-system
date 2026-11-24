import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { fitDomain } from '../../utils/chartScale';

interface ScatterPoint {
  x: number;
  y: number;
}

interface DotShapeProps {
  cx?: number;
  cy?: number;
  isActive?: boolean;
}

function renderScatterDot(color: string) {
  return ({ cx, cy, isActive }: DotShapeProps) => {
    if (cx == null || cy == null) return <g />;
    return (
      <g style={{ cursor: 'pointer' }}>
        <circle cx={cx} cy={cy} r={10} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={isActive ? 6 : 4.5}
          fill={color}
          stroke={isActive ? '#002858' : '#ffffff'}
          strokeWidth={isActive ? 2 : 1.5}
        />
      </g>
    );
  };
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
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const trendSegment =
    trend && data.length > 1 && minX !== maxX
      ? ([
          { x: minX, y: trend.slope * minX + trend.intercept },
          { x: maxX, y: trend.slope * maxX + trend.intercept },
        ] as const)
      : null;

  const dotShape = renderScatterDot(color);
  const xUnitText = xUnit ? ` ${xUnit}` : '';
  const yUnitText = yUnit === '%' ? '%' : yUnit ? ` ${yUnit}` : '';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
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
            const p = payload?.[0]?.payload as ScatterPoint | undefined;
            if (!active || !p) return null;
            return (
              <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-card">
                <p className="text-slate-600">
                  {xLabel}: <span className="mono-num font-semibold text-primary">{p.x}{xUnitText}</span>
                </p>
                <p className="text-slate-600">
                  {yLabel}: <span className="mono-num font-semibold text-primary">{p.y}{yUnitText}</span>
                </p>
              </div>
            );
          }}
        />
        {trendSegment && (
          <ReferenceLine
            segment={trendSegment}
            ifOverflow="hidden"
            stroke="#002858"
            strokeWidth={2}
            strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <Scatter data={data} fill={color} shape={dotShape} activeShape={dotShape} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
