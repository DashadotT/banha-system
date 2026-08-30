import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import type { TTestResult } from '../../types';

export function TTestResultsTable({ results }: { results: TTestResult[] }) {
  return (
    <Card>
      <CardHeader
        title="Independent Samples T-Test"
        subtitle="Experimental group vs. Comparison group, per subject"
      />
      <div className="space-y-4">
        {results.map((r) => (
          <div key={r.subject} className="rounded-md border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">{r.subject}</p>
              <Badge tone={r.significant ? 'accent' : 'neutral'}>
                {r.significant ? 'Significant' : 'Not Significant'}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">n (Experimental)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.nExperimental}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">n (Comparison)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.nComparison}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Mean (Experimental)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {r.meanExperimental}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Mean (Comparison)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {r.meanComparison}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">t-value</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.tValue}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">df</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">
                  {r.degreesOfFreedom}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">p-value</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.pValue}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Decision</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">{r.decision}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{r.interpretation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
