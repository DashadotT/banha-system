import type { ReactNode } from 'react';

/**
 * Caps the visible table to roughly 10 rows tall, scrolling vertically for
 * anything beyond that, with the header pinned via `sticky` so column labels
 * stay visible while scrolling. Pass `scrollable={false}` to opt out (e.g.
 * for a table that's already known to be short).
 */
export function TableShell({
  children,
  scrollable = true,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
      <div className={`overflow-x-auto ${scrollable ? 'max-h-[30rem] overflow-y-auto' : ''}`}>
        <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`sticky top-0 z-10 whitespace-nowrap border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap border-b border-border px-4 py-3 text-slate-700 ${className}`}>{children}</td>;
}