import type { ReactNode } from 'react';

const TONES = {
  primary: 'bg-primary-50 text-primary',
  secondary: 'bg-secondary-50 text-secondary-700',
  accent: 'bg-accent-50 text-accent-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
} as const;

export type StatTone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  icon,
  iconTone = 'primary',
  suffix,
  hint,
  className = '',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconTone?: StatTone;
  suffix?: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-white p-5 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[iconTone]}`}>{icon}</div>
      </div>
      <p className="mono-num mt-3 text-3xl font-bold leading-none text-primary">
        {value}
        {suffix && <span className="ml-1.5 text-sm font-medium text-slate-400">{suffix}</span>}
      </p>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
