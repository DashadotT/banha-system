import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { CorrelationScatter } from './CorrelationScatter';
import { linearRegression } from '../../utils/statistics';
import { getScoreValue, type ScoreMode, type ScoreModeMeta } from '../../utils/scoreMode';
import type { AnalysisRow } from '../../services/analysisService';
import type { PearsonResult } from '../../types';

interface VariableSpec {
  key: 'temperature' | 'noise';
  title: string;
  unit: string;
  color: string;
  minSpan: number;
  value: (r: AnalysisRow) => number | null;
}

const VARIABLES: VariableSpec[] = [
  { key: 'temperature', title: 'Temperature', unit: '°C', color: '#678EC4', minSpan: 2, value: (r) => r.avgTemperature },
  { key: 'noise', title: 'Noise Level', unit: 'dBA', color: '#DEAE20', minSpan: 6, value: (r) => r.avgNoise },
];

/** Bar of r for each variable on a fixed −1 … +1 axis. */
function CoefficientChart({ results }: { results: PearsonResult[] }) {
  const data = results.map((r) => ({ name: r.variableX, r: r.r, significant: r.significant }));
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" horizontal={false} />
        <XAxis
          type="number"
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={96} />
        <ReferenceLine x={0} stroke="#94a3b8" />
        <Tooltip
          cursor={{ fill: 'rgba(103,142,196,0.08)' }}
          formatter={(value) => [String(value), 'r']}
          contentStyle={{ borderRadius: 8, border: '1px solid #E2E6EC', fontSize: 12 }}
        />
        <Bar dataKey="r" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.significant ? '#DEAE20' : '#B9CBE5'} />
          ))}
          <LabelList
            dataKey="r"
            content={({ x, y, width, height, index }) => {
              if (index == null || x == null || y == null || width == null || height == null) return null;
              const d = data[index];
              if (!d) return null;
              const barX = Number(x);
              const barY = Number(y);
              const barW = Number(width);
              const barH = Number(height);
              const tipX = barX + barW;
              const insideNegative = d.r <= -0.75 && Math.abs(barW) >= 56;
              const textX = d.r >= 0 ? tipX + 8 : insideNegative ? tipX + 8 : tipX - 8;
              const textAnchor = d.r >= 0 || insideNegative ? 'start' : 'end';
              return (
                <text
                  x={textX}
                  y={barY + barH / 2}
                  dy="0.35em"
                  textAnchor={textAnchor}
                  fill="#002858"
                  fontSize={12}
                  fontWeight={600}
                  className="mono-num"
                >
                  {String(d.r)}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Pearson correlation results with their figures: the correlation
 * coefficients, and one scatter plot (with trend line) per variable.
 */
export function PearsonAnalysis({
  rows,
  results,
  mode,
  meta,
}: {
  rows: AnalysisRow[];
  results: PearsonResult[];
  mode: ScoreMode;
  meta: ScoreModeMeta;
}) {
  const scored = rows.filter((r) => getScoreValue(r.assessment, mode) !== null);

  return (
    <div className="space-y-6">
      <Card className="print:break-inside-avoid">
        <CardHeader
          title="Pearson Product-Moment Correlation"
          subtitle={`Environmental variables vs. ${meta.label} · α = 0.05`}
        />
        <CoefficientChart results={results} />
        <p className="mt-1 text-center text-xs text-slate-400">
          Correlation coefficient (r) · <span className="text-accent-700">gold</span> = statistically significant
        </p>
      </Card>

      {results.map((r) => {
        const spec = VARIABLES.find((v) => v.title === r.variableX) ?? VARIABLES[0];
        const points = scored
          .filter((row) => spec.value(row) !== null)
          .map((row) => ({ x: spec.value(row) as number, y: getScoreValue(row.assessment, mode) as number }));
        const fit = linearRegression(points.map((p) => p.x), points.map((p) => p.y));

        return (
          <Card key={`${r.variableX}-${r.variableY}`} className="print:break-inside-avoid">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">
                {r.variableX} vs. {r.variableY}
              </p>
              <Badge tone={r.significant ? 'accent' : 'neutral'}>
                {r.significant ? 'Significant' : 'Not Significant'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <dl className="grid grid-cols-2 gap-3">
                  <Stat label="Sample size (n)" value={r.n} />
                  <Stat label="Pearson r" value={r.r} />
                  <Stat label="r² (variance explained)" value={r.rSquared} />
                  <Stat label="p-value" value={r.pValue} />
                  <Stat label="Significance (α)" value="0.05" />
                  <Stat label="Trend slope" value={fit ? `${Number(fit.slope.toFixed(3))} ${meta.unit}/${spec.unit}` : '—'} />
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-slate-600">{r.interpretation}</p>
              </div>
              <div className="lg:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Scatter plot with trend line
                </p>
                <CorrelationScatter
                  data={points}
                  xLabel={spec.title}
                  xUnit={spec.unit}
                  yLabel={meta.short}
                  yUnit={meta.unit}
                  color={spec.color}
                  trend={fit}
                  xMinSpan={spec.minSpan}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}
