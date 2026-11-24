import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/States';
import { round } from '../../utils/calculations';
import type { ScoreModeMeta } from '../../utils/scoreMode';
import type { WelchTTestResult } from '../../types';

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #E2E6EC',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
};
const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' };
const EXP_COLOR = '#DEAE20';
const COMP_COLOR = '#678EC4';

function formatUnit(meta: ScoreModeMeta): string {
  return meta.unit === '%' ? '%' : ` ${meta.unit}`;
}

/** Overall mean of each group, with ±1 SD whiskers. */
function MeansChart({ result, meta }: { result: WelchTTestResult; meta: ScoreModeMeta }) {
  const u = formatUnit(meta);
  const data = [
    ...(result.nExperimental > 0
      ? [{ name: 'Experimental', mean: result.meanExperimental, sd: result.sdExperimental, color: EXP_COLOR }]
      : []),
    ...(result.nComparison > 0
      ? [{ name: 'Comparison', mean: result.meanComparison, sd: result.sdComparison, color: COMP_COLOR }]
      : []),
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: '#E2E6EC' }} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={[0, 'auto']} />
        <Tooltip
          cursor={{ fill: 'rgba(103,142,196,0.08)' }}
          formatter={(value) => [`${value}${u}`, 'Mean']}
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

/** Individual assessment scores across the Experimental and Comparison groups. */
function GroupScoresChart({ result, meta }: { result: WelchTTestResult; meta: ScoreModeMeta }) {
  const u = formatUnit(meta);
  const sortedExp = [...result.experimentalScores].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true })
  );
  const sortedComp = [...result.comparisonScores].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true })
  );
  const data = [...sortedExp, ...sortedComp].map((obs, index) => ({
    id: `${obs.group}-${index}`,
    label: obs.label,
    group: obs.group,
    score: round(obs.score, 2),
  }));
  const labelById = new Map(data.map((d) => [d.id, d.label]));
  const many = data.length > 4;

  return (
    <div>
      <ResponsiveContainer width="100%" height={many ? 320 : 280}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
          <XAxis
            dataKey="id"
            tickFormatter={(v) => labelById.get(String(v)) ?? String(v)}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={{ stroke: '#E2E6EC' }}
            tickLine={false}
            interval={0}
            angle={many ? -30 : 0}
            textAnchor={many ? 'end' : 'middle'}
            height={many ? 76 : 30}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={[0, 'auto']} />
          <Tooltip
            cursor={{ fill: 'rgba(103,142,196,0.08)' }}
            labelFormatter={(v) => labelById.get(String(v)) ?? String(v)}
            formatter={(value, _name, item) => [`${value}${u}`, item?.payload?.group ?? 'Score']}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.group === 'Experimental' ? EXP_COLOR : COMP_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXP_COLOR }} />
          Experimental ({result.nExperimental})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COMP_COLOR }} />
          Comparison ({result.nComparison})
        </span>
      </div>
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

/**
 * Welch's independent-samples t-test: one overall result for the filtered
 * dataset (all subjects pooled together, or the selected subject), with figures.
 */
export function WelchTTestAnalysis({ result, meta }: { result: WelchTTestResult; meta: ScoreModeMeta }) {
  const u = formatUnit(meta);
  const computed =
    result.nExperimental >= 2 && result.nComparison >= 2 && result.decision !== 'Not computable';
  const bothPresent = result.nExperimental > 0 && result.nComparison > 0;

  if (result.nExperimental === 0 && result.nComparison === 0) {
    return (
      <EmptyState
        title="No Experimental or Comparison scores available"
        description="Welch's t-test needs scored assessments in both the Experimental and Comparison groups."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="print:break-inside-avoid">
        <CardHeader
          title="Welch's T-Test"
          subtitle={`Experimental vs. Comparison ${meta.label} · ${result.label}`}
          action={
            <Badge tone={result.significant ? 'accent' : 'neutral'}>
              {result.significant ? 'Significant' : computed ? 'Not Significant' : result.decision}
            </Badge>
          }
        />
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="n (Experimental)" value={result.nExperimental} />
          <Stat label="n (Comparison)" value={result.nComparison} />
          <Stat
            label="Mean (Experimental)"
            value={result.nExperimental > 0 ? `${result.meanExperimental}${u}` : '—'}
          />
          <Stat
            label="Mean (Comparison)"
            value={result.nComparison > 0 ? `${result.meanComparison}${u}` : '—'}
          />
          <Stat
            label="SD (Experimental)"
            value={result.nExperimental >= 2 ? result.sdExperimental : '—'}
          />
          <Stat
            label="SD (Comparison)"
            value={result.nComparison >= 2 ? result.sdComparison : '—'}
          />
          <Stat
            label="Mean difference"
            value={bothPresent ? `${result.meanDifference > 0 ? '+' : ''}${result.meanDifference}${u}` : '—'}
          />
          <Stat label="Std. error" value={computed ? result.standardError : '—'} />
          <Stat label="t-value" value={computed ? result.tValue : '—'} />
          <Stat label="df (Welch)" value={computed ? result.degreesOfFreedom : '—'} />
          <Stat label="p-value" value={computed ? result.pValue : '—'} />
          <Stat label="Significance (α)" value="0.05" />
          {computed && (
            <Stat label="95% CI of difference" value={`${result.ciLower} to ${result.ciUpper}`} />
          )}
          {computed && <Stat label="Effect size (Cohen's d)" value={result.effectSize} />}
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Decision</dt>
            <dd className="mt-0.5 text-sm font-medium text-primary">{result.decision}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">{result.interpretation}</p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="print:break-inside-avoid">
          <CardHeader title="Mean Score by Group" subtitle="Whiskers show ±1 standard deviation" />
          <MeansChart result={result} meta={meta} />
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader
            title="Individual Assessment Scores"
            subtitle="All scored assessments grouped by Experimental vs. Comparison"
          />
          <GroupScoresChart result={result} meta={meta} />
        </Card>
      </div>
    </div>
  );
}
