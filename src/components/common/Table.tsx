import type { ReactNode } from 'react';

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-border px-4 py-3 text-slate-700 ${className}`}>{children}</td>;
}
