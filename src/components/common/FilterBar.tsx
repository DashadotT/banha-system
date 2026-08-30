import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
