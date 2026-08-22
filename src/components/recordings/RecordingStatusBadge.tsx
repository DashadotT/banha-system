import { Badge } from '../common/Badge';
import type { RecordingStatus } from '../../types';

const STATUS_CONFIG: Record<RecordingStatus, { label: string; tone: 'accent' | 'normal' | 'moderate' }> = {
  recording: { label: 'Recording', tone: 'accent' },
  completed: { label: 'Completed', tone: 'normal' },
  pending_assessment: { label: 'Pending Assessment Details', tone: 'moderate' },
};

export function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge tone={config.tone} dot={status === 'recording'}>
      {config.label}
    </Badge>
  );
}
