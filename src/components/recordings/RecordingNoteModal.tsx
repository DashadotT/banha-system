import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { updateRecordingNote } from '../../services/recordingService';
import type { Recording } from '../../types';

export function RecordingNoteModal({
  recording,
  onClose,
  onSaved,
}: {
  recording: Recording | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(recording?.notes ?? '');
    setError(null);
  }, [recording]);

  async function handleSave() {
    if (!recording) return;
    setSaving(true);
    setError(null);
    try {
      await updateRecordingNote(recording.id, value);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(recording)}
      onClose={onClose}
      title={recording?.notes ? 'Edit note' : 'Add note'}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Save note
          </Button>
        </>
      }
    >
      <p className="mb-2 text-xs text-slate-500">
        Recording <span className="font-mono">{recording?.id.slice(0, 8)}</span> — assessment topic, testing
        information, observations, or anything else worth remembering.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        autoFocus
        placeholder="e.g. Quiz 2 on Chapter 4 — continued next session, windows were open."
        className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
      />
      <p className="mt-1 text-xs text-slate-400">Clear the text and save to remove the note.</p>
      {error && <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}
