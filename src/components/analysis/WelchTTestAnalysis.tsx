import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/States';
import { round } from '../../utils/calculations';
import { fitDomain } from '../../utils/chartScale';
import type { ScoreModeMeta } from '../../utils/scoreMode';
import type { GroupObservation, WelchTTestResult } from '../../types';

const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const AXIS_LABEL_STYLE = { fontSize: 11, fill: '#475569', fontWeight: 500, textAnchor: 'middle' as const };
const EXP_COLOR = '#DEAE20';
const COMP_COLOR = '#678EC4';
const CHART_HEIGHT = 280;

function formatUnit(meta: ScoreModeMeta): string {
  return meta.unit === '%' ? '%' : ` ${meta.unit}`;
}

/**
 * Y-axis scale anchored at 0 so differences between group means are never
 * visually exaggerated, while leaving headroom for ±1 SD whiskers.
 */
function buildZeroBasedYAxis(maxUpper: number, unit: string): { domain: [number, number]; ticks: number[] } {
  if (unit === '%' && maxUpper <= 100) {
    return { domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100] };
  }
  const fitted = fitDomain([0, Math.max(maxUpper, 1)], 5);
  const ticks = fitted.ticks.filter((t) => t >= 0);
  return { domain: [0, fitted.domain[1]], ticks: ticks.length >= 2 ? ticks : [0, fitted.domain[1]] };
}

interface MeansDatum {
  name: 'Experimental' | 'Comparison';
  mean: number;
  sd: number;
  rawSd: number;
  n: number;
  color: string;
}

/** Overall mean of each group, with ±1 SD error bars and exact mean labels above whiskers. */
function MeansChart({ result, meta }: { result: WelchTTestResult; meta: ScoreModeMeta }) {
  const u = formatUnit(meta);
  const data: MeansDatum[] = [
    ...(result.nExperimental > 0
      ? [
          {
            name: 'Experimental' as const,
            mean: result.meanExperimental,
            sd: result.nExperimental >= 2 ? result.sdExperimental : 0,
            rawSd: result.sdExperimental,
            n: result.nExperimental,
            color: EXP_COLOR,
          },
        ]
      : []),
    ...(result.nComparison > 0
      ? [
          {
            name: 'Comparison' as const,
            mean: result.meanComparison,
            sd: result.nComparison >= 2 ? result.sdComparison : 0,
            rawSd: result.sdComparison,
            n: result.nComparison,
            color: COMP_COLOR,
          },
        ]
      : []),
  ];

  const maxUpper = Math.max(...data.map((d) => d.mean + d.sd), 0);
  const yAxis = buildZeroBasedYAxis(maxUpper, meta.unit);

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={data} margin={{ top: 28, right: 20, left: 10, bottom: 8 }} barCategoryGap="32%">
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
            axisLine={{ stroke: '#CBD5E1' }}
            tickLine={false}
            tickMargin={6}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            label={{
              value: `Mean Score (${meta.unit})`,
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              style: AXIS_LABEL_STYLE,
            }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(103,142,196,0.08)' }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as MeansDatum | undefined;
              if (!active || !d) return null;
              return (
                <div className="min-w-[190px] rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs shadow-card">
                  <div className="mb-1.5 flex items-center gap-2 font-semibold text-primary">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </div>
                  <dl className="space-y-1 text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                      <dt>Mean score</dt>
                      <dd className="mono-num font-semibold text-primary">
                        {d.mean}
                        {u}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>Std. deviation</dt>
                      <dd className="mono-num font-medium text-primary">
                        {d.n >= 2 ? `±${d.rawSd}${u}` : '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>Observations (n)</dt>
                      <dd className="mono-num font-medium text-primary">{d.n}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Bar dataKey="mean" radius={[4, 4, 0, 0]} maxBarSize={84} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <ErrorBar dataKey="sd" width={12} stroke="#1e293b" strokeWidth={1.75} isAnimationActive={false} />
            <LabelList
              dataKey="mean"
              content={(labelProps) => {
                const { x, y, width, height, index } = labelProps;
                if (index == null || x == null || y == null || width == null || height == null) return null;
                const d = data[index];
                if (!d) return null;
                const barY = Number(y);
                const barH = Number(height);
                const barW = Number(width);
                const barX = Number(x);
                const whiskerOffset = d.mean > 0 && barH > 0 ? (d.sd * barH) / d.mean : 0;
                const textY = Math.max(14, barY - whiskerOffset - 8);
                return (
                  <text
                    x={barX + barW / 2}
                    y={textY}
                    textAnchor="middle"
                    fill="#002858"
                    fontSize={12}
                    fontWeight={600}
                    className="mono-num"
                  >
                    {d.mean}
                    {u}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-slate-500">
        {result.nExperimental > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXP_COLOR }} />
            Experimental (n = {result.nExperimental})
          </span>
        )}
        {result.nComparison > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COMP_COLOR }} />
            Comparison (n = {result.nComparison})
          </span>
        )}
      </div>
    </div>
  );
}

interface AssessmentCategoryDatum {
  key: string;
  shortLabel: string;
  fullName: string;
  experimental: number | null;
  comparison: number | null;
  experimentalCount: number;
  comparisonCount: number;
  experimentalSections: string[];
  comparisonSections: string[];
}

function buildAssessmentFullName(obs: GroupObservation): string {
  const typePart = [obs.assessmentType, obs.assessmentNumber != null ? `#${obs.assessmentNumber}` : null]
    .filter(Boolean)
    .join(' ');
  const subject = obs.subject && obs.subject !== 'Unspecified' ? obs.subject : null;
  return [subject, typePart || null].filter(Boolean).join(' — ') || obs.label;
}

function buildAssessmentCategories(result: WelchTTestResult): AssessmentCategoryDatum[] {
  interface Bucket {
    key: string;
    subject: string;
    assessmentType: string;
    assessmentNumber: number | null;
    fullName: string;
    exp: GroupObservation[];
    comp: GroupObservation[];
  }

  const buckets = new Map<string, Bucket>();
  const add = (obs: GroupObservation) => {
    const hasStructured = obs.assessmentType != null || obs.assessmentNumber != null;
    const key = hasStructured
      ? [obs.subject, obs.assessmentType ?? '', obs.assessmentNumber ?? ''].join('|').toLowerCase()
      : obs.label.toLowerCase();
    const bucket = buckets.get(key) ?? {
      key,
      subject: obs.subject,
      assessmentType: obs.assessmentType ?? '',
      assessmentNumber: obs.assessmentNumber ?? null,
      fullName: buildAssessmentFullName(obs),
      exp: [],
      comp: [],
    };
    if (obs.group === 'Experimental') bucket.exp.push(obs);
    else bucket.comp.push(obs);
    buckets.set(key, bucket);
  };

  result.experimentalScores.forEach(add);
  result.comparisonScores.forEach(add);

  const sorted = Array.from(buckets.values()).sort((a, b) => {
    const subjCmp = a.subject.localeCompare(b.subject, undefined, { numeric: true });
    if (subjCmp !== 0) return subjCmp;
    const typeCmp = a.assessmentType.localeCompare(b.assessmentType, undefined, { numeric: true });
    if (typeCmp !== 0) return typeCmp;
    if (a.assessmentNumber != null && b.assessmentNumber != null && a.assessmentNumber !== b.assessmentNumber) {
      return a.assessmentNumber - b.assessmentNumber;
    }
    if (a.assessmentNumber != null && b.assessmentNumber == null) return -1;
    if (a.assessmentNumber == null && b.assessmentNumber != null) return 1;
    return a.fullName.localeCompare(b.fullName, undefined, { numeric: true });
  });

  const numbers = sorted.map((b) => b.assessmentNumber);
  const allHaveUniqueNumbers =
    numbers.every((n): n is number => n !== null) && new Set(numbers).size === numbers.length;

  const avg = (items: GroupObservation[]) =>
    items.length > 0 ? round(items.reduce((s, o) => s + o.score, 0) / items.length, 2) : null;
  const sections = (items: GroupObservation[]) =>
    Array.from(new Set(items.map((o) => o.section).filter((s): s is string => Boolean(s))));

  return sorted.map((b, idx) => ({
    key: b.key,
    shortLabel: allHaveUniqueNumbers ? `Assessment ${b.assessmentNumber}` : `Assessment ${idx + 1}`,
    fullName: b.fullName,
    experimental: avg(b.exp),
    comparison: avg(b.comp),
    experimentalCount: b.exp.length,
    comparisonCount: b.comp.length,
    experimentalSections: sections(b.exp),
    comparisonSections: sections(b.comp),
  }));
}

/** Grouped bar chart pairing Experimental vs. Comparison scores per assessment. */
function GroupScoresChart({ result, meta }: { result: WelchTTestResult; meta: ScoreModeMeta }) {
  const u = formatUnit(meta);
  const categories = buildAssessmentCategories(result);

  const maxScore = Math.max(
    ...categories.flatMap((c) => [c.experimental ?? 0, c.comparison ?? 0]),
    0
  );
  const yAxis = buildZeroBasedYAxis(maxScore, meta.unit);
  const needsScroll = categories.length > 3;

  return (
    <div>
      <div className="overflow-x-auto pb-1 print:overflow-visible">
        <div
          style={{ minWidth: needsScroll ? `${categories.length * 108}px` : undefined }}
          className="w-full"
        >
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart
              data={categories}
              margin={{ top: 16, right: 16, left: 10, bottom: 8 }}
              barGap={6}
              barCategoryGap="24%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                interval={0}
                tickMargin={6}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={56}
                domain={yAxis.domain}
                ticks={yAxis.ticks}
                label={{
                  value: `${meta.short} (${meta.unit})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 4,
                  style: AXIS_LABEL_STYLE,
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(103,142,196,0.08)' }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as AssessmentCategoryDatum | undefined;
                  if (!active || !row) return null;
                  const entries = [
                    row.experimental !== null
                      ? {
                          group: 'Experimental',
                          color: EXP_COLOR,
                          score: row.experimental,
                          count: row.experimentalCount,
                          sections: row.experimentalSections,
                        }
                      : null,
                    row.comparison !== null
                      ? {
                          group: 'Comparison',
                          color: COMP_COLOR,
                          score: row.comparison,
                          count: row.comparisonCount,
                          sections: row.comparisonSections,
                        }
                      : null,
                  ].filter((e): e is NonNullable<typeof e> => e !== null);

                  return (
                    <div className="min-w-[220px] rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs shadow-card">
                      <p className="font-semibold text-primary">{row.fullName}</p>
                      {row.fullName !== row.shortLabel && (
                        <p className="mb-2 text-[11px] text-slate-400">{row.shortLabel}</p>
                      )}
                      <div className="space-y-2 border-t border-slate-100 pt-2">
                        {entries.map((entry) => (
                          <div key={entry.group} className="space-y-0.5">
                            <div className="flex items-center justify-between gap-4">
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-sm"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.group}
                              </span>
                              <span className="mono-num font-semibold text-primary">
                                {entry.score}
                                {u}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pl-4 text-[11px] text-slate-500">
                              <span>
                                {entry.count} observation{entry.count === 1 ? '' : 's'}
                              </span>
                              {entry.sections.length > 0 && <span>{entry.sections.join(', ')}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              {result.nExperimental > 0 && (
                <Bar
                  dataKey="experimental"
                  name="Experimental"
                  fill={EXP_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              )}
              {result.nComparison > 0 && (
                <Bar
                  dataKey="comparison"
                  name="Comparison"
                  fill={COMP_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
        {result.nExperimental > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXP_COLOR }} />
            Experimental (n = {result.nExperimental})
          </span>
        )}
        {result.nComparison > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COMP_COLOR }} />
            Comparison (n = {result.nComparison})
          </span>
        )}
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
          <CardHeader title="Mean Score by Group" subtitle="Whiskers represent ±1 Standard Deviation" />
          <MeansChart result={result} meta={meta} />
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader
            title="Assessment Scores"
            subtitle="Experimental vs. Comparison per assessment · Hover bars for full details"
          />
          <GroupScoresChart result={result} meta={meta} />
        </Card>
      </div>
    </div>
  );
}
