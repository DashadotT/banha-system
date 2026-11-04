import type { ReactNode } from 'react';
import { Logo } from '../layout/Logo';

/** Same page frame and card as the Login page. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-border bg-white p-7 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold text-primary">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          BANHA — Bridging Air, Noise, Heat, and Achievement
        </p>
      </div>
    </div>
  );
}
