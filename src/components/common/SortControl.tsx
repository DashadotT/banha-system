import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';

export interface SortOption {
    value: string;
    label: string;
}

export function SortControl({
    options,
    sortBy,
    onSortByChange,
    direction,
    onDirectionChange,
}: {
    options: SortOption[];
    sortBy: string;
    onSortByChange: (value: string) => void;
    direction: 'asc' | 'desc';
    onDirectionChange: (direction: 'asc' | 'desc') => void;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                aria-label="Sort by"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        Sort: {opt.label}
                    </option>
                ))}
            </select>
            <button
                onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-surface"
                title={direction === 'asc' ? 'Ascending' : 'Descending'}
            >
                {direction === 'asc' ? <ArrowUpAZ size={15} /> : <ArrowDownAZ size={15} />}
                {direction === 'asc' ? 'Asc' : 'Desc'}
            </button>
        </div>
);
}