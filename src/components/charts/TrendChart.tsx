import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EnvironmentalReading } from '../../types';
import { formatDateTime, formatDateShort, formatTime } from '../../utils/dateTime';
import { buildTimeTicks, fitDomain } from '../../utils/chartScale';

interface TrendChartProps {
  data: EnvironmentalReading[];
  metric: 'average_temperature' | 'average_noise';
  color: string;
  unit: string;
  height?: number;
  /** Smallest value range shown on the Y axis (defaults by unit). */
  minSpan?: number;
}

interface Point {
  t: number;
  value: number | null;
  packet?: number;
}

const DEFAULT_MIN_SPAN: Record<string, number> = { '°C': 2, dBA: 6 };

export function TrendChart({ data, metric, color, unit, height = 220, minSpan }: TrendChartProps) {
  const { points, domain, ticks, step, xTicks, multiDay, stats, showDots } = useMemo(() => {
    const sorted = [...data]
      .map((d) => ({ t: new Date(d.recorded_at).getTime(), value: d[metric], packet: d.packet_number }))
      .filter((d) => !Number.isNaN(d.t))
      .sort((a, b) => a.t - b.t);

    // Break the line across long gaps (e.g. between recording days) instead
    // of drawing a misleading straight line through time with no data.
    const gaps = sorted.slice(1).map((p, i) => p.t - sorted[i].t).sort((a, b) => a - b);
    const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 60_000;
    const gapLimit = Math.max(median * 5, 5 * 60_000);
    const withBreaks: Point[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p.t - sorted[i - 1].t > gapLimit) {
        withBreaks.push({ t: sorted[i - 1].t + 1, value: null });
      }
      withBreaks.push(p);
    });

    const values = sorted.map((p) => p.value);
    const fit = fitDomain(values, minSpan ?? DEFAULT_MIN_SPAN[unit] ?? 1);
    const minT = sorted.length ? sorted[0].t : 0;
    const maxT = sorted.length ? sorted[sorted.length - 1].t : 1;
    const multi = new Date(minT).toDateString() !== new Date(maxT).toDateString();
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

    return {
      points: withBreaks,
      domain: fit.domain,
      ticks: fit.ticks,
      step: fit.step,
      xTicks: sorted.length ? buildTimeTicks(minT, maxT) : [],
      multiDay: multi,
      stats: values.length
        ? { min: Math.min(...values), max: Math.max(...values), avg: avg as number }
        : null,
      showDots: sorted.length <= 40,
    };
  }, [data, metric, unit, minSpan]);

  if (!stats) return null;

  const decimals = step < 1 ? 1 : 0;
  const tickLabel = (ms: number) => (multiDay ? `${formatDateShort(new Date(ms)).replace(/, \d{4}$/, '')} ${formatTime(new Date(ms))}` : formatTime(new Date(ms)));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={xTicks}
            tickFormatter={tickLabel}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#E2E6EC' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={(v: number) => v.toFixed(decimals)}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={44}
            label={{
              value: unit,
              angle: -90,
              position: 'insideLeft',
              offset: 14,
              style: { fontSize: 11, fill: '#94a3b8', textAnchor: 'middle' },
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as Point | undefined;
              if (!active || !p || p.value === null) return null;
              return (
                <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-card">
                  <p className="font-semibold text-primary">{formatDateTime(new Date(p.t))}</p>
                  <p className="mt-0.5 text-slate-600">
                    <span className="mono-num font-semibold" style={{ color }}>
                      {p.value.toFixed(1)} {unit}
                    </span>
                    {p.packet !== undefined && <span className="text-slate-400"> · packet {p.packet}</span>}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={stats.avg}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: `avg ${stats.avg.toFixed(1)}`, position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={showDots ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 4.5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-slate-500">
        Min <span className="mono-num font-medium text-primary">{stats.min.toFixed(1)}</span> · Avg{' '}
        <span className="mono-num font-medium text-primary">{stats.avg.toFixed(1)}</span> · Max{' '}
        <span className="mono-num font-medium text-primary">{stats.max.toFixed(1)}</span> {unit}
      </p>
    </div>
  );
}
