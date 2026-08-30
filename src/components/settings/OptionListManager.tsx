import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, Check, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Input } from '../common/FormField';
import { Button } from '../common/Button';
import { EmptyState, ErrorState, LoadingState } from '../common/States';
import { ArchiveConfirmDialog } from '../common/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import {
  addSettingOption,
  archiveSettingOption,
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
  const {
    data: archived,
    loading: loadingArchived,
    refetch: refetchArchived,
  } = useAsync(() => fetchArchivedSettingOptions(category));

  useRealtimeRefresh(['settings_options'], () => {
    refetch();
    refetchArchived();
  });

  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<SettingOption | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function refetchAll() {
    refetch();
    refetchArchived();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    const trimmed = value.trim();
    if (!trimmed) return;
    if ((data ?? []).some((opt) => opt.value.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('This option already exists.');
      return;
    }
    setAdding(true);
    try {
      await addSettingOption(category, trimmed);
      setValue('');
      refetch();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add option.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(opt: SettingOption) {
    setEditingId(opt.id);
    setEditValue(opt.value);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
    setEditError(null);
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

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveSettingOption(archiveTarget.id);
      setArchiveTarget(null);
      refetchAll();
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore(id: string) {
    setRestoringId(id);
    try {
      await restoreSettingOption(id);
      refetchAll();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="submit" size="sm" icon={<Plus size={14} />} loading={adding}>
          Add
        </Button>
      </form>

      {addError && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {addError}
        </div>
      )}

      {loading && <LoadingState label="Loading options…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState title="No options yet" description="Add your first option above." />
      )}

      {!loading && !error && (data ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {(data ?? []).map((opt) => (
            <li key={opt.id} className="flex items-center justify-between gap-2 px-3 py-2">
              {editingId === opt.id ? (
                <>
                  <div className="flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="py-1"
                      autoFocus
                    />
                    {editError && <p className="mt-1 text-xs text-rose-600">{editError}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => saveEdit(opt.id)}
                      disabled={savingEdit}
                      className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      title="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-surface disabled:opacity-50"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm text-primary">{opt.value}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(opt)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-secondary-50 hover:text-secondary-700"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setArchiveTarget(opt)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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

      {(archived ?? []).length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-primary"
          >
            {showArchived ? 'Hide' : 'Show'} archived ({(archived ?? []).length})
          </button>
          {showArchived && (
            <ul className="mt-2 divide-y divide-border rounded-md border border-dashed border-border">
              {loadingArchived && (
                <li className="px-3 py-2 text-xs text-slate-400">Loading…</li>
              )}
              {(archived ?? []).map((opt) => (
                <li key={opt.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm text-slate-400 line-through">{opt.value}</span>
                  <button
                    onClick={() => handleRestore(opt.id)}
                    disabled={restoringId === opt.id}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ArchiveConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        itemLabel={archiveTarget?.value ?? ''}
        loading={archiving}
        description="It will disappear from dropdowns immediately, but any existing recordings or assessments that already used it keep their historical data unchanged. You can restore it here at any time."
      />
    </Card>
  );
}
