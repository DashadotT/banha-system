import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function FormField({
  label,
  children,
  hint,
  required = false,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-surface disabled:text-slate-400 ${
        props.className ?? ''
      }`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:bg-surface disabled:text-slate-400 ${
        props.className ?? ''
      }`}
    />
  );
}
