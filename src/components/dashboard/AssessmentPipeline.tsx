import { CheckCircle2, ClipboardList, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardHeader } from '../common/Card';

interface Step {
  label: string;
  description: string;
  value: number;
  icon: ReactNode;
  tile: string;
  bar: string;
}

/** Pending → Incomplete → Completed assessment details, with a stacked progress bar. */
export function AssessmentPipeline({
  pending,
  incomplete,
  completed,
}: {
  pending: number;
  incomplete: number;
  completed: number;
}) {
  const total = pending + incomplete + completed;
  const steps: Step[] = [
    {
      label: 'Pending',
      description: 'No details yet',
      value: pending,
      icon: <ClipboardList size={15} />,
      tile: 'bg-slate-100 text-slate-600',
      bar: 'bg-slate-300',
    },
    {
      label: 'Incomplete',
      description: 'Some details missing',
      value: incomplete,
      icon: <ListChecks size={15} />,
      tile: 'bg-amber-50 text-amber-700',
      bar: 'bg-amber-400',
    },
    {
      label: 'Completed',
      description: 'Final results entered',
      value: completed,
      icon: <CheckCircle2 size={15} />,
      tile: 'bg-emerald-50 text-emerald-700',
      bar: 'bg-emerald-500',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader
        title="Assessment Pipeline"
        subtitle={total === 0 ? 'No assessments yet' : `${total} assessment${total === 1 ? '' : 's'} in total`}
      />
      <div className="grid grid-cols-3 gap-3">
        {steps.map((s) => (
          <div key={s.label} className="rounded-lg bg-surface p-3">
            <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-md ${s.tile}`}>{s.icon}</div>
            <p className="mono-num text-2xl font-bold leading-none text-primary">{s.value}</p>
            <p className="mt-1.5 text-xs font-semibold text-primary">{s.label}</p>
            <p className="text-[11px] leading-tight text-slate-500">{s.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {total > 0 &&
          steps.map((s) => <div key={s.label} className={s.bar} style={{ width: `${(s.value / total) * 100}%` }} />)}
      </div>
    </Card>
  );
}
