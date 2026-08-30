import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <svg className="h-6 w-6 animate-spin text-secondary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 py-12 text-center">
      <p className="text-sm font-medium text-rose-700">Something went wrong</p>
      <p className="max-w-sm text-xs text-rose-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-14 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
