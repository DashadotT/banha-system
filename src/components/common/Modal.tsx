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
  size?: 'sm' | 'md' | 'lg';
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

  const widthClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

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
        className={`relative z-10 w-full ${widthClass} rounded-lg border border-border bg-white shadow-xl`}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  loading?: boolean;
  description?: string;
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
    </Modal>
  );
}

export function RestoreConfirmDialog({
  open,
  onClose,
  onConfirm,
  itemLabel,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemLabel: string;
  loading?: boolean;
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
        Restore <span className="font-medium text-primary">{itemLabel}</span>? It will become
        available again in active lists, reports, and statistical analysis.
      </p>
    </Modal>
  );
}
