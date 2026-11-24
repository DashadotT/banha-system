import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/States';
import type { ScoreModeMeta } from '../../utils/scoreMode';
import type { PairedTTestResult } from '../../types';

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #E2E6EC',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
};
const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' };
const EXP_COLOR = '#DEAE20';
const COMP_COLOR = '#678EC4';

/** Overall mean of each group, with ±1 SD whiskers. */
function MeansChart({ result, meta }: { result: PairedTTestResult; meta: ScoreModeMeta }) {
  const data = [
    { name: 'Experimental', mean: result.meanExperimental, sd: result.sdExperimental, color: EXP_COLOR },
    { name: 'Comparison', mean: result.meanComparison, sd: result.sdComparison, color: COMP_COLOR },
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: '#E2E6EC' }} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={[0, 'auto']} />
        <Tooltip
          cursor={{ fill: 'rgba(103,142,196,0.08)' }}
          formatter={(value) => [`${value} ${meta.unit}`, 'Mean']}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar dataKey="mean" radius={[3, 3, 0, 0]} maxBarSize={90} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
          <ErrorBar dataKey="sd" width={8} stroke="#334155" strokeWidth={1.5} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Experimental vs Comparison score for every matched pair. */
function PairScoresChart({ result, meta }: { result: PairedTTestResult; meta: ScoreModeMeta }) {
  const many = result.pairs.length > 4;
  const data = result.pairs.map((p) => ({ label: p.label, Experimental: p.experimental, Comparison: p.comparison }));
  return (
    <ResponsiveContainer width="100%" height={many ? 320 : 280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          interval={0}
          angle={many ? -30 : 0}
          textAnchor={many ? 'end' : 'middle'}
          height={many ? 76 : 30}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={[0, 'auto']} />
        <Tooltip formatter={(value) => [`${value} ${meta.unit}`, '']} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Experimental" fill={EXP_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="Comparison" fill={COMP_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Experimental − Comparison for every pair, with the mean difference marked. */
function DifferenceChart({ result, meta }: { result: PairedTTestResult; meta: ScoreModeMeta }) {
  const many = result.pairs.length > 4;
  const data = result.pairs.map((p) => ({ label: p.label, difference: p.difference }));
  return (
    <ResponsiveContainer width="100%" height={many ? 320 : 280}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          interval={0}
          angle={many ? -30 : 0}
          textAnchor={many ? 'end' : 'middle'}
          height={many ? 76 : 30}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(value) => [`${Number(value) > 0 ? '+' : ''}${value} ${meta.unit}`, 'Experimental − Comparison']}
          contentStyle={TOOLTIP_STYLE}
        />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <ReferenceLine
          y={result.meanDifference}
          stroke="#002858"
          strokeDasharray="5 4"
          label={{ value: `mean ${result.meanDifference > 0 ? '+' : ''}${result.meanDifference}`, position: 'insideTopRight', fontSize: 10, fill: '#002858' }}
        />
        <Bar dataKey="difference" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.difference >= 0 ? EXP_COLOR : COMP_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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

/**
 * Paired-samples t-test: one overall result for the filtered dataset (all
 * subjects pooled together, or the selected subject), with its figures.
 */
export function PairedTTestAnalysis({ result, meta }: { result: PairedTTestResult; meta: ScoreModeMeta }) {
  const u = meta.unit === '%' ? '%' : ` ${meta.unit}`;
  const computed = result.nPairs >= 2 && result.decision !== 'Not computable';

  if (result.nPairs === 0) {
    return (
      <EmptyState
        title="No matched Experimental / Comparison pairs"
        description="A paired t-test needs an Experimental and a Comparison assessment with the same subject, assessment type and assessment number."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="print:break-inside-avoid">
        <CardHeader
          title="Paired Samples T-Test"
          subtitle={`Experimental vs. Comparison ${meta.label} · ${result.label}`}
          action={
            <Badge tone={result.significant ? 'accent' : 'neutral'}>
              {result.significant ? 'Significant' : computed ? 'Not Significant' : result.decision}
            </Badge>
          }
        />
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Matched pairs (n)" value={result.nPairs} />
          <Stat label="Mean (Experimental)" value={`${result.meanExperimental}${u}`} />
          <Stat label="Mean (Comparison)" value={`${result.meanComparison}${u}`} />
          <Stat label="Mean difference" value={`${result.meanDifference > 0 ? '+' : ''}${result.meanDifference}${u}`} />
          <Stat label="SD (Experimental)" value={result.sdExperimental} />
          <Stat label="SD (Comparison)" value={result.sdComparison} />
          <Stat label="SD of differences" value={result.sdDifference} />
          <Stat label="Std. error" value={result.standardError} />
          <Stat label="t-value" value={result.tValue} />
          <Stat label="df" value={result.degreesOfFreedom} />
          <Stat label="p-value" value={result.pValue} />
          <Stat label="Significance (α)" value="0.05" />
          {computed && <Stat label="95% CI of difference" value={`${result.ciLower} to ${result.ciUpper}`} />}
          {computed && <Stat label="Effect size (Cohen's dz)" value={result.effectSize} />}
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Decision</dt>
            <dd className="mt-0.5 text-sm font-medium text-primary">{result.decision}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">{result.interpretation}</p>
        {result.unmatched > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {result.unmatched} assessment{result.unmatched === 1 ? '' : 's'} had no matching partner in the other group
            and {result.unmatched === 1 ? 'was' : 'were'} left out.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="print:break-inside-avoid">
          <CardHeader title="Mean Score by Group" subtitle="Whiskers show ±1 standard deviation" />
          <MeansChart result={result} meta={meta} />
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader title="Matched Pair Scores" subtitle="Each pair = same subject, assessment type and number" />
          <PairScoresChart result={result} meta={meta} />
        </Card>
      </div>

      <Card className="print:break-inside-avoid">
        <CardHeader
          title="Difference per Pair (Experimental − Comparison)"
          subtitle="Bars above zero favour the Experimental group; the dashed line is the mean difference"
        />
        <DifferenceChart result={result} meta={meta} />
      </Card>
    </div>
  );
}
