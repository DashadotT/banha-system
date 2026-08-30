import { Card, CardHeader } from '../common/Card';
import type { DescriptiveStats } from '../../types';

export function DescriptiveStatsTable({ stats }: { stats: DescriptiveStats[] }) {
  return (
    <Card>
      <CardHeader
        title="Descriptive Statistics"
        subtitle="Summary of each variable across the selected, non-archived dataset"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Variable
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                n
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mean
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Median
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Std. Dev.
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Min
              </th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Max
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.label} className="border-b border-border">
                <td className="py-2.5 pr-4 font-medium text-primary">
                  {s.label} {s.unit && <span className="text-xs text-slate-400">({s.unit})</span>}
                </td>
                <td className="mono-num py-2.5 pr-4">{s.n}</td>
                <td className="mono-num py-2.5 pr-4">{s.mean}</td>
                <td className="mono-num py-2.5 pr-4">{s.median}</td>
                <td className="mono-num py-2.5 pr-4">{s.standardDeviation}</td>
                <td className="mono-num py-2.5 pr-4">{s.min}</td>
                <td className="mono-num py-2.5 pr-4">{s.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
