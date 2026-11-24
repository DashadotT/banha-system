import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fitDomain } from '../../utils/chartScale';
import { ENV_THRESHOLD_TABLE, type EnvLevel } from '../../utils/calculations';

const LEVEL_COLOR: Record<EnvLevel, string> = {
  good: '#10B981',
  fair: '#F59E0B',
  poor: '#F43F5E',
};

export interface MetricBarDatum {
  label: string;
  value: number;
  n: number;
  level: EnvLevel;
  /** Wording of the classification (e.g. Optimal, Moderate, High). */
  status: string;
}

/** Wraps long schedule/room labels across at most 2 clean horizontal lines. */
function WrappedAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
}) {
  const text = String(payload?.value ?? '');
  let lines: string[] = [text];
  if (text.length > 14) {
    const spaceIdx = text.indexOf(' ', Math.floor(text.length * 0.35));
    const fallbackIdx = text.lastIndexOf(' ', 16);
    const splitAt = spaceIdx > 0 ? spaceIdx : fallbackIdx;
    if (splitAt > 0) {
      lines = [text.slice(0, splitAt), text.slice(splitAt + 1)];
    }
  }
  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      {lines.map((line, i) => (
        <text
          key={`${line}-${i}`}
          x={0}
          y={12 + i * 13}
          textAnchor="middle"
          fill="#475569"
          fontSize={11}
          fontWeight={500}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** Bars coloured by the study's classification ranges, anchored at zero. */
export function MetricBarChart({
  data,
  unit,
  metric,
  yAxisLabel,
  height = 270,
  showLegend = true,
}: {
  data: MetricBarDatum[];
  unit: string;
  metric?: 'temperature' | 'noise';
  yAxisLabel?: string;
  height?: number;
  showLegend?: boolean;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No data available for this selection.</p>;
  }

  const maxVal = Math.max(...data.map((d) => d.value), 0);
  const top = fitDomain([0, maxVal], 1);
  const ticks = top.ticks.filter((t) => t >= 0);
  const hasLongLabels = data.some((d) => d.label.length > 14);
  const needsScroll = data.length > 4 || (data.length > 2 && hasLongLabels);
  const unitSuffix = unit === '°C' ? '°C' : ` ${unit}`;
  const thresholdRows = metric ? ENV_THRESHOLD_TABLE[metric].rows : null;

  return (
    <div>
      <div className="overflow-x-auto pb-1 print:overflow-visible">
        <div
          style={{ minWidth: needsScroll ? `${data.length * (hasLongLabels ? 124 : 96)}px` : undefined }}
          className="w-full"
        >
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{ top: 24, right: 16, left: 8, bottom: hasLongLabels ? 18 : 6 }}
              barCategoryGap="28%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                interval={0}
                height={hasLongLabels ? 38 : 28}
                tick={<WrappedAxisTick />}
              />
              <YAxis
                domain={[0, top.domain[1]]}
                ticks={ticks.length >= 2 ? ticks : [0, top.domain[1]]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={54}
                label={{
                  value: yAxisLabel ?? unit,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 4,
                  style: { fontSize: 11, fill: '#475569', fontWeight: 500, textAnchor: 'middle' },
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(103,142,196,0.08)' }}
                content={({ active, payload }) => {
                  const d = payload?.[0]?.payload as MetricBarDatum | undefined;
                  if (!active || !d) return null;
                  return (
                    <div className="min-w-[180px] rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs shadow-card">
                      <p className="font-semibold text-primary">{d.label}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: LEVEL_COLOR[d.level] }}
                          />
                          {d.status}
                        </span>
                        <span className="mono-num font-semibold text-primary">
                          {d.value.toFixed(1)}
                          {unitSuffix}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {d.n} assessment{d.n === 1 ? '' : 's'}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.label} fill={LEVEL_COLOR[d.level]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v) => `${Number(v).toFixed(1)}${unit === '°C' ? '°C' : ''}`}
                  style={{ fontSize: 11, fontWeight: 600, fill: '#002858' }}
                  className="mono-num"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {showLegend && thresholdRows && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          {thresholdRows.map((row) => (
            <span key={row.label} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: LEVEL_COLOR[row.level] }}
              />
              <span className="font-medium text-slate-600">{row.label}</span>
              <span className="text-slate-400">({row.range})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
