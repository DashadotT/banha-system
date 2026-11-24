import { Printer } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DescriptiveStatsTable } from './DescriptiveStatsTable';
import { PearsonAnalysis } from './PearsonAnalysis';
import { PairedTTestAnalysis } from './PairedTTestAnalysis';
import { formatDate } from '../../utils/dateTime';
import type { AnalysisRow } from '../../services/analysisService';
import type { ScoreMode, ScoreModeMeta } from '../../utils/scoreMode';
import type { DescriptiveStats, PairedTTestResult, PearsonResult } from '../../types';

/** Plain-language one-line conclusion for each test, used in the summary of findings. */
function findings(pearson: PearsonResult[], paired: PairedTTestResult): string[] {
  const lines = pearson.map((r) => r.interpretation);
  lines.push(paired.interpretation);
  return lines;
}

/**
 * Printable research report. It brings together the OVERALL results of the
 * current filter selection — descriptive statistics, Pearson correlation and
 * the paired-samples t-test — together with their figures, and is printed or
 * saved as a PDF from the browser.
 */
export function AnalysisReport({
  rows,
  descriptiveStats,
  pearsonResults,
  pairedResult,
  mode,
  meta,
  filterSummary,
}: {
  rows: AnalysisRow[];
  descriptiveStats: DescriptiveStats[];
  pearsonResults: PearsonResult[];
  pairedResult: PairedTTestResult;
  mode: ScoreMode;
  meta: ScoreModeMeta;
  filterSummary: string;
}) {
  const experimental = rows.filter((r) => r.assessment.group_type === 'Experimental').length;
  const comparison = rows.filter((r) => r.assessment.group_type === 'Comparison').length;
  const conclusions = findings(pearsonResults, pairedResult);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-500">
          Review the overall results below, then print the report or save it as a PDF.
        </p>
        <Button variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
          Print Report
        </Button>
      </div>

      <div className="space-y-8 rounded-lg border border-border bg-white p-6 shadow-card print:space-y-6 print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-600">BANHA Research Report</p>
          <h2 className="mt-1 text-xl font-bold text-primary">
            Classroom Environment and Academic Performance — Statistical Analysis
          </h2>
          <p className="mt-1 text-xs text-slate-500">Generated {formatDate(new Date())}</p>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold text-primary">Dataset filters: </dt>
              <dd className="inline">{filterSummary}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-primary">Score used: </dt>
              <dd className="inline">{meta.label}</dd>
            </div>
          </dl>
        </header>

        <section className="print:break-inside-avoid">
          <h3 className="mb-2 text-sm font-semibold text-primary">1. Dataset Overview</h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <span>
              Assessments analysed: <span className="font-semibold text-primary">{rows.length}</span>
            </span>
            <span>
              <Badge tone="accent">Experimental</Badge> <span className="font-semibold text-primary">{experimental}</span>
            </span>
            <span>
              <Badge tone="neutral">Comparison</Badge> <span className="font-semibold text-primary">{comparison}</span>
            </span>
            <span>
              Matched pairs: <span className="font-semibold text-primary">{pairedResult.nPairs}</span>
            </span>
          </div>
        </section>

        <section className="print:break-inside-avoid">
          <h3 className="mb-2 text-sm font-semibold text-primary">2. Summary of Findings</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
            {conclusions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary">3. Descriptive Statistics</h3>
          <DescriptiveStatsTable stats={descriptiveStats} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary">4. Pearson Product-Moment Correlation</h3>
          <PearsonAnalysis rows={rows} results={pearsonResults} mode={mode} meta={meta} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-primary">5. Paired Samples T-Test</h3>
          <PairedTTestAnalysis result={pairedResult} meta={meta} />
        </section>

        <footer className="border-t border-border pt-3 text-[11px] text-slate-400">
          Significance level α = 0.05. Temperature and noise values are the average of each assessment&apos;s
          1-minute environmental readings; scores are the {meta.label.toLowerCase()} entered for each assessment.
        </footer>
      </div>
    </div>
  );
}
