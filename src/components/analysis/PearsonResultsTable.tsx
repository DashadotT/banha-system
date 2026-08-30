import { Card, CardHeader } from '../common/Card';
import { Badge } from '../common/Badge';
import type { PearsonResult } from '../../types';

export function PearsonResultsTable({ results }: { results: PearsonResult[] }) {
  return (
    <Card>
      <CardHeader
        title="Pearson Product-Moment Correlation"
        subtitle="Environmental variables vs. Score Percentage"
      />
      <div className="space-y-4">
        {results.map((r) => (
          <div key={`${r.variableX}-${r.variableY}`} className="rounded-md border border-border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">
                {r.variableX} vs. {r.variableY}
              </p>
              <Badge tone={r.significant ? 'accent' : 'neutral'}>
                {r.significant ? 'Significant' : 'Not Significant'}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Sample size (n)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.n}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">r</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.r}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">p-value</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{r.pValue}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Significance (α)</dt>
                <dd className="mono-num mt-0.5 text-sm font-medium text-primary">0.05</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{r.interpretation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
