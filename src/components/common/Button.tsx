import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-800 focus-visible:ring-primary-400',
  secondary: 'bg-secondary text-white hover:bg-secondary-600 focus-visible:ring-secondary-300',
  outline:
    'bg-white text-primary border border-border hover:bg-surface focus-visible:ring-secondary-300',
  ghost: 'bg-transparent text-primary hover:bg-primary-50 focus-visible:ring-secondary-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
