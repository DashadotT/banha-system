import { Radio } from 'lucide-react';
import type { Recording } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatDateTime, formatDuration, elapsedSeconds } from '../../utils/dateTime';
import { useEffect, useState } from 'react';

export function CurrentRecordingPanel({ recording }: { recording: Recording | null }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!recording || recording.status !== 'recording') return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  if (!recording) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Radio size={22} className="text-slate-300" />
        <p className="text-sm font-medium text-primary">No active recording</p>
        <p className="text-xs text-slate-500">
          Start a BANHA device session to see live status here.
        </p>
      </Card>
    );
  }

  const duration = elapsedSeconds(recording.started_at, recording.ended_at);

  return (
    <Card className="border-primary-100">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">Current Recording</p>
        <Badge tone="accent" dot>
          RECORDING
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Device</dt>
          <dd className="mt-0.5 font-medium text-primary">
            {recording.device?.device_name ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Started</dt>
          <dd className="mt-0.5 font-medium text-primary">{formatDateTime(recording.started_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Duration</dt>
          <dd className="mono-num mt-0.5 font-semibold text-accent-700">
            {formatDuration(duration)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Status</dt>
          <dd className="mt-0.5 font-medium text-primary">Recording</dd>
        </div>
      </dl>
    </Card>
  );
}
