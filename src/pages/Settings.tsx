import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { OptionListManager } from '../components/settings/OptionListManager';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { profile, session } = useAuth();

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
              <p className="text-sm font-semibold text-primary">{profile?.full_name ?? '—'}</p>
              <p className="text-xs text-slate-500">{profile?.email ?? session?.user.email ?? '—'}</p>
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
      </div>
    </AppLayout>
  );
}
