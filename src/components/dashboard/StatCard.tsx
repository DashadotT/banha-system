import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  icon,
  iconTone = 'primary',
  suffix,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconTone?: 'primary' | 'secondary' | 'accent';
  suffix?: string;
}) {
  const toneClasses = {
    primary: 'bg-primary-50 text-primary',
    secondary: 'bg-secondary-50 text-secondary-700',
    accent: 'bg-accent-50 text-accent-700',
  }[iconTone];

  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${toneClasses}`}>
          {icon}
        </div>
      </div>
      <p className="mono-num mt-3 text-2xl font-bold text-primary">
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-slate-400">{suffix}</span>}
      </p>
    </div>
  );
}
