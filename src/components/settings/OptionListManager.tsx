import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { Input } from '../common/FormField';
import { Button } from '../common/Button';
import { EmptyState, ErrorState, LoadingState } from '../common/States';
import { useAsync } from '../../hooks/useAsync';
import { addSettingOption, deleteSettingOption, fetchSettingOptions } from '../../services/settingsService';
import type { SettingCategory } from '../../types';

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
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteSettingOption(id);
      refetch();
    } finally {
      setDeletingId(null);
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
        <EmptyState title="No options yet" description={`Add your first option above.`} />
      )}

      {!loading && !error && (data ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {(data ?? []).map((opt) => (
            <li key={opt.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-primary">{opt.value}</span>
              <button
                onClick={() => handleDelete(opt.id)}
                disabled={deletingId === opt.id}
                className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
