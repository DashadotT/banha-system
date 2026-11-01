import { useEffect, useState } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ErrorState, LoadingState } from '../common/States';
import { GroupCombinedCard } from './GroupCombinedCard';
import { AssessmentDetailsSection } from '../assessments/AssessmentDetailsSection';
import { ProgressBadge } from '../assessments/AssessmentDetailsView';
import { useAsync } from '../../hooks/useAsync';
import { fetchReadingsForRecordings, fetchRecordingsInGroup } from '../../services/recordingService';
import { fetchAssessmentForRecording } from '../../services/assessmentService';

/**
 * Consolidated view of one assessment group: its shared assessment details,
 * the combined mean temperature / noise across all sessions, and the list of
 * individual recordings (each opens its own details).
 */
export function AssessmentGroupPanel({
  groupId,
  onChanged,
  onOpenRecording,
}: {
  groupId: string;
  onChanged?: () => void;
  onOpenRecording: (recordingId: string) => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: members, loading, error } = useAsync(() => fetchRecordingsInGroup(groupId), [groupId, refreshKey]);
  const active = (members ?? []).filter((m) => !m.is_archived);
  const first = active[0];

  const { data: assessment } = useAsync(
    () => (first ? fetchAssessmentForRecording(first.id, groupId) : Promise.resolve(null)),
    [groupId, first?.id, refreshKey]
  );
  const { data: readings } = useAsync(
    () => fetchReadingsForRecordings(active.map((m) => m.id)),
    [active.map((m) => m.id).join(','), refreshKey]
  );

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    onChanged?.();
  };

  if (loading && !members) return <LoadingState label="Loading assessment group…" />;
  if (error) return <ErrorState message={error} />;
  if (!first) return <p className="text-sm text-slate-500">This assessment group has no active recordings.</p>;

  const activeAssessment = assessment && !assessment.is_archived ? assessment : null;

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={15} />
          {notice}
        </div>
      )}

      <Card className="border-accent-200 bg-accent-50/40">
        <div className="flex flex-wrap items-center gap-2">
          <Layers size={16} className="text-accent-700" />
          <span className="text-sm font-semibold text-primary">{first.group?.name}</span>
          <ProgressBadge finalized={Boolean(activeAssessment?.is_finalized)} />
          <Badge tone="neutral">
            {active.length} recording{active.length === 1 ? '' : 's'}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {activeAssessment?.is_finalized
            ? 'Marked Completed — final results are part of this assessment.'
            : 'Ongoing — more recordings of the same assessment can still be added from the Recordings page.'}
        </p>
      </Card>

      <GroupCombinedCard members={active} readings={readings ?? []} onOpenRecording={onOpenRecording} showCharts />

      <AssessmentDetailsSection
        recording={first}
        assessment={activeAssessment}
        members={active}
        showSession={false}
        embedded
        onChanged={refresh}
        onNotice={setNotice}
      />
    </div>
  );
}
