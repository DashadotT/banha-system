import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Button } from './Button';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-primary-900/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[90vh] w-full ${widthClass} flex-col rounded-lg border border-border bg-white shadow-xl`}
      >
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ArchiveConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemLabel,
  loading = false,
  description,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  loading?: boolean;
  description?: string;
  error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archive record"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} loading={loading}>
            Archive
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Archive <span className="font-medium text-primary">{itemLabel}</span>?{' '}
        {description ??
          'Archived data is removed from active views and excluded from Dashboard totals, generated reports, Pearson correlation, and t-test calculations. You can restore it later from Archived Records.'}
      </p>
      {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}

export function RestoreConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemLabel,
  loading = false,
  description,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  loading?: boolean;
  description?: string;
  error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Restore record"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={onConfirm} loading={loading}>
            Restore
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Restore <span className="font-medium text-primary">{itemLabel}</span>?{' '}
        {description ?? 'It will become available again in active lists, reports, and statistical analysis.'}
      </p>
      {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}

export function PermanentDeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemLabel,
  loading = false,
  description,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  loading?: boolean;
  description?: string;
  error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Permanently delete record"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
            Delete Permanently
          </Button>
        </>
      }
    >
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
        <p className="text-sm font-medium text-rose-700">This action cannot be undone.</p>
        <p className="mt-1 text-xs text-rose-600">
          {description ?? (
            <>
              Permanently deleting <span className="font-medium">{itemLabel}</span> removes it — and any
              environmental readings or assessment linked to it — from the database entirely. Unlike
              archiving, there is no way to restore it afterward.
            </>
          )}
        </p>
      </div>
      {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}


export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  confirmLabel,
  children,
  loading = false,
  variant = 'primary',
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmLabel: string;
  children: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{children}</div>
      {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}
