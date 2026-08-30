import {
  Archive,
  ListChecks,
  Pencil,
  Radio,
  RotateCcw,
  Settings as SettingsIcon,
  Square,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { EmptyState, ErrorState, LoadingState } from '../common/States';
import { timeAgo } from '../../utils/dateTime';
import type { ActivityLogEntry } from '../../types';

interface ActionMeta {
  label: string;
  icon: LucideIcon;
  iconClass: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  recording_started: { label: 'Recording started', icon: Radio, iconClass: 'text-accent-700 bg-accent-50' },
  recording_stopped: { label: 'Recording stopped', icon: Square, iconClass: 'text-secondary-700 bg-secondary-50' },
  recording_archived: { label: 'Recording archived', icon: Archive, iconClass: 'text-slate-500 bg-slate-100' },
  recording_restored: { label: 'Recording restored', icon: RotateCcw, iconClass: 'text-emerald-700 bg-emerald-50' },
  recording_deleted: { label: 'Recording permanently deleted', icon: Trash2, iconClass: 'text-rose-700 bg-rose-50' },
  assessment_added: { label: 'Assessment added', icon: ListChecks, iconClass: 'text-primary bg-primary-50' },
  assessment_updated: { label: 'Assessment updated', icon: Pencil, iconClass: 'text-secondary-700 bg-secondary-50' },
  assessment_archived: { label: 'Assessment archived', icon: Archive, iconClass: 'text-slate-500 bg-slate-100' },
  assessment_restored: { label: 'Assessment restored', icon: RotateCcw, iconClass: 'text-emerald-700 bg-emerald-50' },
  assessment_deleted: { label: 'Assessment permanently deleted', icon: Trash2, iconClass: 'text-rose-700 bg-rose-50' },
  setting_added: { label: 'Setting added', icon: SettingsIcon, iconClass: 'text-primary bg-primary-50' },
  setting_renamed: { label: 'Setting renamed', icon: Pencil, iconClass: 'text-secondary-700 bg-secondary-50' },
  setting_archived: { label: 'Setting archived', icon: Archive, iconClass: 'text-slate-500 bg-slate-100' },
  setting_restored: { label: 'Setting restored', icon: RotateCcw, iconClass: 'text-emerald-700 bg-emerald-50' },
  profile_renamed: { label: 'Account name updated', icon: User, iconClass: 'text-secondary-700 bg-secondary-50' },
};

const DEFAULT_META: ActionMeta = {
  label: 'Activity',
  icon: Pencil,
  iconClass: 'text-slate-500 bg-slate-100',
};

export function ActivityLogWidget({
  entries,
  loading,
  error,
  onRetry,
}: {
  entries: ActivityLogEntry[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader title="Activity Log" subtitle="Recent research-data actions across the system" />

      {loading && <LoadingState label="Loading activity…" />}
      {error && <ErrorState message={error} onRetry={onRetry} />}

      {!loading && !error && (entries ?? []).length === 0 && (
        <EmptyState
          title="No activity yet"
          description="Actions like starting a recording, adding an assessment, or archiving a record will show up here."
        />
      )}

      {!loading && !error && (entries ?? []).length > 0 && (
        <ul className="divide-y divide-border">
          {(entries ?? []).map((entry) => {
            const meta = ACTION_META[entry.action] ?? DEFAULT_META;
            const Icon = meta.icon;
            return (
              <li key={entry.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary">
                    <span className="font-medium">{meta.label}</span>
                    {entry.entity_label && (
                      <span className="text-slate-500"> — {entry.entity_label}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {entry.actor_name} · {timeAgo(entry.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
