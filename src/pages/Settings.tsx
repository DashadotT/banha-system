import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/FormField';
import { Button } from '../components/common/Button';
import { Logo } from '../components/layout/Logo';
import { OptionListManager } from '../components/settings/OptionListManager';
import { useAuth } from '../context/AuthContext';
import { updateProfileName } from '../services/authService';
import { APP_DESCRIPTION, APP_STACK, APP_TAGLINE, APP_VERSION } from '../config/appInfo';

export default function Settings() {
  const { profile, session, setProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNameValue(profile?.full_name ?? '');
    setEditingName(true);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfileName(profile.id, trimmed);
      setProfile(updated);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="System Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Account" subtitle="Your researcher/administrator account for this system" />
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
              {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    className="w-56"
                  />
                  <Button type="submit" size="sm" icon={<Check size={14} />} loading={saving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<X size={14} />}
                    onClick={() => setEditingName(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary">{profile?.full_name ?? '—'}</p>
                  <button
                    onClick={startEdit}
                    className="rounded-md p-1 text-slate-400 hover:bg-secondary-50 hover:text-secondary-700"
                    title="Edit name"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
              <p className="mt-0.5 text-xs text-slate-500">{profile?.email ?? session?.user.email ?? '—'}</p>
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>
            <Badge tone={profile?.role === 'administrator' ? 'accent' : 'neutral'}>
              {profile?.role === 'administrator' ? 'Administrator' : 'Researcher'}
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <OptionListManager
            category="subject"
            title="Subjects"
            subtitle="Used in the Assessment form and filters"
            placeholder="e.g. Information Management"
          />
          <OptionListManager
            category="section"
            title="Sections"
            subtitle="e.g. A, B, C"
            placeholder="e.g. BSIT 3-A"
          />
          <OptionListManager
            category="assessment_type"
            title="Assessment Types"
            subtitle="e.g. Quiz, Examination, Activity"
            placeholder="e.g. Quiz"
          />
        </div>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Logo compact />
              <div>
                <p className="text-sm font-semibold text-primary">About BANHA</p>
                <p className="text-xs text-slate-500">{APP_TAGLINE}</p>
              </div>
            </div>
            <Badge tone="neutral">Version {APP_VERSION}</Badge>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{APP_DESCRIPTION}</p>
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Built with
            </p>
            <div className="flex flex-wrap gap-1.5">
              {APP_STACK.map((tech) => (
                <Badge key={tech} tone="neutral">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
