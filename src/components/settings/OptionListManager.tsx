import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Card } from '../common/Card';
import { Input } from '../common/FormField';
import { Button } from '../common/Button';
import { ErrorState, LoadingState } from '../common/States';
import { ArchiveConfirmDialog, PermanentDeleteConfirmDialog, RestoreConfirmDialog } from '../common/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import {
  addSettingOption,
  archiveSettingOption,
  deleteSettingOption,
  fetchArchivedSettingOptions,
  fetchSettingOptions,
  restoreSettingOption,
  updateSettingOption,
} from '../../services/settingsService';
import type { SettingCategory, SettingOption } from '../../types';

export function OptionListManager({
  category,
  title,
  subtitle,
  placeholder,
}: {
  category: SettingCategory;
  title: string;
  subtitle: string;
  placeholder: string;
}) {
  const { data, loading, error, refetch } = useAsync(() => fetchSettingOptions(category));
  const { data: archived, refetch: refetchArchived } = useAsync(() => fetchArchivedSettingOptions(category));

  useRealtimeRefresh(['settings_options'], () => {
    refetch();
    refetchArchived();
  });

  const [view, setView] = useState<'active' | 'archived'>('active');
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<SettingOption | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<SettingOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettingOption | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeList = data ?? [];
  const archivedList = archived ?? [];

  function refetchAll() {
    refetch();
    refetchArchived();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const trimmed = value.trim();
    if (!trimmed) return;
    if (activeList.some((opt) => opt.value.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('This option already exists.');
      return;
    }
    setAdding(true);
    try {
      await addSettingOption(category, trimmed);
      setValue('');
      setView('active');
      refetchAll();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add option.');
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateSettingOption(id, trimmed);
      setEditingId(null);
      refetch();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function runAction(action: () => Promise<void>, close: () => void) {
    setWorking(true);
    setActionError(null);
    try {
      await action();
      close();
      refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setWorking(false);
    }
  }

  const iconBtn = 'rounded-md p-1.5 text-slate-400 disabled:opacity-50';

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 h-10 min-w-0">
        <h3 className="truncate text-sm font-semibold text-primary">{title}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1" />
        <Button type="submit" size="sm" icon={<Plus size={14} />} loading={adding}>
          Add
        </Button>
      </form>
      <p className="mb-2 mt-1 min-h-[1.25rem] text-xs text-rose-600">{addError}</p>

      <div className="mb-2 flex gap-1 border-b border-border text-xs font-medium">
        {(['active', 'archived'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-3 py-1.5 ${
              view === v ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'
            }`}
          >
            {v === 'active' ? `Active (${activeList.length})` : `Archived (${archivedList.length})`}
          </button>
        ))}
      </div>

      {/* Fixed height ≈ 3 rows: the list scrolls, the card never grows. */}
      <div className="h-[8.25rem] overflow-y-auto rounded-md border border-border">
        {view === 'active' && loading && <LoadingState label="Loading options…" />}
        {view === 'active' && error && <ErrorState message={error} onRetry={refetch} />}

        {view === 'active' && !loading && !error && activeList.length === 0 && (
          <p className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
            No options yet — add your first one above.
          </p>
        )}

        {view === 'active' && !loading && !error && activeList.length > 0 && (
          <ul className="divide-y divide-border">
            {activeList.map((opt) => (
              <li key={opt.id} className="flex h-11 items-center justify-between gap-2 px-3">
                {editingId === opt.id ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="py-1"
                        autoFocus
                        title={editError ?? undefined}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => saveEdit(opt.id)} disabled={savingEdit} className={`${iconBtn} text-emerald-600 hover:bg-emerald-50`} title="Save">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} disabled={savingEdit} className={`${iconBtn} hover:bg-surface`} title="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 truncate text-sm text-primary" title={opt.value}>
                      {opt.value}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(opt.id);
                          setEditValue(opt.value);
                          setEditError(null);
                        }}
                        className={`${iconBtn} hover:bg-secondary-50 hover:text-secondary-700`}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          setArchiveTarget(opt);
                        }}
                        className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}
                        title="Archive"
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {view === 'archived' && archivedList.length === 0 && (
          <p className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
            No archived options.
          </p>
        )}

        {view === 'archived' && archivedList.length > 0 && (
          <ul className="divide-y divide-border">
            {archivedList.map((opt) => (
              <li key={opt.id} className="flex h-11 items-center justify-between gap-2 px-3">
                <span className="min-w-0 truncate text-sm text-slate-400 line-through" title={opt.value}>
                  {opt.value}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setActionError(null);
                      setRestoreTarget(opt);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                  >
                    <RotateCcw size={13} />
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setActionError(null);
                      setDeleteTarget(opt);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    title="Permanently delete"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ArchiveConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() =>
          archiveTarget && runAction(() => archiveSettingOption(archiveTarget.id), () => setArchiveTarget(null))
        }
        itemLabel={archiveTarget?.value ?? ''}
        loading={working}
        error={actionError}
        description="It will disappear from dropdowns immediately, but any existing recordings or assessments that already used it keep their historical data unchanged. You can restore it from the Archived tab at any time."
      />

      <RestoreConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() =>
          restoreTarget && runAction(() => restoreSettingOption(restoreTarget.id), () => setRestoreTarget(null))
        }
        itemLabel={restoreTarget?.value ?? ''}
        loading={working}
        error={actionError}
        description="It will appear in dropdowns again."
      />

      <PermanentDeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && runAction(() => deleteSettingOption(deleteTarget.id), () => setDeleteTarget(null))
        }
        itemLabel={deleteTarget?.value ?? ''}
        loading={working}
        error={actionError}
        description={`Permanently deleting “${deleteTarget?.value ?? ''}” removes it from this list for good — it cannot be restored. Existing recordings and assessments that already saved this value keep their data unchanged.`}
      />
    </Card>
  );
}
