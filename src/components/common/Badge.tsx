import type { ReactNode } from 'react';

type BadgeTone = 'normal' | 'moderate' | 'poor' | 'neutral' | 'accent' | 'archived';

const TONE_CLASSES: Record<BadgeTone, string> = {
  normal: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  poor: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200',
  archived: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function statusToTone(status: 'Normal' | 'Moderate' | 'Poor'): BadgeTone {
  if (status === 'Normal') return 'normal';
  if (status === 'Moderate') return 'moderate';
  return 'poor';
}
