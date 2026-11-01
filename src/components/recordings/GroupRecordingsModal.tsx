import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/FormField';
import { ProgressBadge } from '../assessments/AssessmentDetailsView';
import { fetchGroupAssessments } from '../../services/assessmentService';
import { groupRecordings } from '../../services/recordingService';
import { useAsync } from '../../hooks/useAsync';
import { defaultGroupName, identityKey } from '../../utils/assessment';
import type { Recording } from '../../types';

function infoKey(r: Recording): string | null {
  return r.assessment_info ? identityKey(r.assessment_info) : null;
}

/**
 * Groups ungrouped recordings under one assessment. Recordings must share
 * Subject, Section, Group, Assessment Type and Assessment Number; classroom,
 * schedule, date and time may all differ.
 */
export function GroupRecordingsModal({
  recordings,
  open,
  onClose,
  onGrouped,
}: {
  recordings: Recording[];
  open: boolean;
  onClose: () => void;
  onGrouped: (message: string) => void;
}) {
  const { data: groups, loading } = useAsync(fetchGroupAssessments, [open]);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keys = recordings.map(infoKey);
  const missing = recordings.filter((_, i) => keys[i] === null);
  const distinct = new Set(keys.filter(Boolean));
  const mismatch = distinct.size > 1;
  const key = distinct.size === 1 ? [...distinct][0] : null;
  const matches = useMemo(
    () => (key ? (groups ?? []).filter((g) => identityKey(g.assessment) === key) : []),
    [groups, key]
  );
  const canAdd = missing.length === 0 && !mismatch && key !== null;
  const info = recordings[0]?.assessment_info;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(info ? defaultGroupName(info as never) : '');
    const open1 = matches.find((m) => !m.assessment.is_finalized);
    setMode(open1 ? 'existing' : 'new');
    setGroupId(open1?.group.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matches.length, key]);

  async function handleSave() {
    setError(null);
    if (!canAdd) return;
    if (mode === 'existing' && !groupId) return setError('Choose the assessment group.');
    setSaving(true);
    try {
      await groupRecordings(
        recordings.map((r) => r.id),
        mode === 'new' ? { groupName: name.trim() || defaultGroupName(info as never) } : { groupId }
      );
      const label = mode === 'new' ? name.trim() : matches.find((g) => g.group.id === groupId)?.group.name ?? 'group';
      onGrouped(`${recordings.length} recording${recordings.length === 1 ? '' : 's'} added to “${label}”.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not group these recordings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Group recordings into an assessment group"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!canAdd}>
            {mode === 'existing' ? 'Add to group' : 'Create group'}
          </Button>
        </>
      }
    >
      <p className="text-xs text-slate-500">
        Recordings belong to the same assessment when <strong>Subject, Section, Group, Assessment Type and Assessment
        Number</strong> all match. Classroom, schedule, date and time may differ. Each recording keeps its own data;
        the group shows the combined mean temperature and noise.
      </p>

      <ul className="mt-3 divide-y divide-border rounded-md border border-border text-xs">
        {recordings.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="font-mono text-slate-600">{r.id.slice(0, 8)}</span>
            {keys[i] ? (
              <span className="text-slate-600">
                {r.assessment_info?.subject} · {r.assessment_info?.section} · {r.assessment_info?.group_type} ·{' '}
                {r.assessment_info?.assessment_type} {r.assessment_info?.assessment_number}
              </span>
            ) : (
              <Badge tone="poor">Missing assessment identification</Badge>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {missing.length === 1 ? 'A selected recording has' : `${missing.length} selected recordings have`} no Subject,
          Section, Group, Assessment Type and Assessment Number yet. Open the recording, click Edit and enter them
          first — matching is checked against these details.
        </p>
      )}
      {mismatch && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          The selected recordings are not the same assessment. Subject, Section, Group, Assessment Type and Assessment
          Number must all match.
        </p>
      )}

      {canAdd && (
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-primary">
            <input type="radio" name="group-mode" className="mt-1" checked={mode === 'existing'}
              disabled={matches.length === 0} onChange={() => setMode('existing')} />
            <span className="flex-1">
              Add to an existing assessment group
              {loading && <span className="ml-2 text-xs text-slate-400">Loading…</span>}
              {!loading && matches.length === 0 && (
                <span className="mt-1 block text-xs text-slate-500">No existing group matches these details.</span>
              )}
              {matches.length > 0 && mode === 'existing' && (
                <span className="mt-2 block space-y-1.5">
                  {matches.map((m) => (
                    <label key={m.group.id} className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                      m.assessment.is_finalized ? 'border-border text-slate-400' : 'border-accent-200 bg-accent-50/50 text-primary'}`}>
                      <span className="flex items-center gap-2">
                        <input type="radio" name="match" checked={groupId === m.group.id}
                          disabled={m.assessment.is_finalized} onChange={() => setGroupId(m.group.id)} />
                        {m.group.name}
                        <span className="text-xs text-slate-500">({m.memberCount} recording{m.memberCount === 1 ? '' : 's'})</span>
                      </span>
                      <ProgressBadge finalized={m.assessment.is_finalized} />
                    </label>
                  ))}
                  {matches.some((m) => m.assessment.is_finalized) && (
                    <span className="block text-xs text-slate-500">
                      Completed groups can’t take new recordings until they are set back to Ongoing.
                    </span>
                  )}
                </span>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-primary">
            <input type="radio" name="group-mode" className="mt-1" checked={mode === 'new'}
              disabled={matches.length > 0 && matches.every((m) => !m.assessment.is_finalized)}
              onChange={() => setMode('new')} />
            <span className="flex-1">
              Create a new assessment group
              {matches.length > 0 && matches.every((m) => !m.assessment.is_finalized) && (
                <span className="mt-1 block text-xs text-slate-500">
                  A group for this assessment already exists — add to it instead of creating a duplicate.
                </span>
              )}
              {mode === 'new' && (
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Assessment group name" className="mt-2" />
              )}
            </span>
          </label>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    </Modal>
  );
}
