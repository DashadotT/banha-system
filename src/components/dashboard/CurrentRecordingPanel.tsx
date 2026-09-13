import { Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Recording } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

import {
  formatDateTime,
  formatDuration,
  elapsedSecondsFromServer,
} from '../../utils/dateTime';

import { fetchServerTime } from '../../services/recordingService';

export function CurrentRecordingPanel({
  recording,
}: {
  recording: Recording | null;
}) {
  // Forces the component to refresh every second while recording.
  const [, forceTick] = useState(0);

  // -------------------------------------------------------------------------
  // Server-time synchronization
  // -------------------------------------------------------------------------

  const [serverNowMs, setServerNowMs] = useState<number | null>(null);
  const [performanceStartMs, setPerformanceStartMs] = useState<number | null>(
    null
  );

  /**
   * Synchronize with Supabase server time whenever a recording becomes active.
   *
   * serverNowMs:
   *   Authoritative server time returned by Supabase.
   *
   * performanceStartMs:
   *   Monotonic browser timer captured at the exact moment serverNowMs
   *   was obtained.
   *
   * This allows the live timer to continue without relying on Date.now().
   */
  useEffect(() => {
    let cancelled = false;

    if (!recording || recording.status !== 'recording') {
      setServerNowMs(null);
      setPerformanceStartMs(null);
      return;
    }

    async function synchronizeServerTime() {
      try {
        const serverTime = await fetchServerTime();

        if (cancelled) return;

        setServerNowMs(serverTime);
        setPerformanceStartMs(performance.now());
      } catch (error) {
        console.error(
          'Failed to synchronize recording timer with server time:',
          error
        );

        if (!cancelled) {
          setServerNowMs(null);
          setPerformanceStartMs(null);
        }
      }
    }

    synchronizeServerTime();

    return () => {
      cancelled = true;
    };
  }, [recording?.id, recording?.status]);

  // -------------------------------------------------------------------------
  // One-second UI refresh
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!recording || recording.status !== 'recording') return;

    const interval = setInterval(() => {
      forceTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [recording?.id, recording?.status]);

  // -------------------------------------------------------------------------
  // No active recording
  // -------------------------------------------------------------------------

  if (!recording) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Radio size={22} className="text-slate-300" />

        <p className="text-sm font-medium text-primary">
          No active recording
        </p>

        <p className="text-xs text-slate-500">
          Start a BANHA device session to see live status here.
        </p>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Calculate live duration
  // -------------------------------------------------------------------------

  let duration = 0;

  if (
    recording.status === 'recording' &&
    serverNowMs !== null &&
    performanceStartMs !== null
  ) {
    duration = elapsedSecondsFromServer(
      recording.started_at,
      serverNowMs,
      performanceStartMs
    );
  } else if (recording.ended_at) {
    // For a completed recording, use the authoritative timestamps.
    const start = new Date(recording.started_at).getTime();
    const end = new Date(recording.ended_at).getTime();

    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      duration = Math.max(0, Math.floor((end - start) / 1000));
    }
  }

  return (
    <Card className="border-primary-100">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">
          Current Recording
        </p>

        <Badge tone="accent" dot>
          RECORDING
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        {/* Device */}
        <div>
          <dt className="text-xs text-slate-500">Device</dt>

          <dd className="mt-0.5 font-medium text-primary">
            {recording.device?.device_name ?? '—'}
          </dd>
        </div>

        {/* Started */}
        <div>
          <dt className="text-xs text-slate-500">Started</dt>

          <dd className="mt-0.5 font-medium text-primary">
            {formatDateTime(recording.started_at)}
          </dd>
        </div>

        {/* Duration */}
        <div>
          <dt className="text-xs text-slate-500">Duration</dt>

          <dd className="mono-num mt-0.5 font-semibold text-accent-700">
            {formatDuration(duration)}
          </dd>
        </div>

        {/* Status */}
        <div>
          <dt className="text-xs text-slate-500">Status</dt>

          <dd className="mt-0.5 font-medium text-primary">
            Recording
          </dd>
        </div>
      </dl>
    </Card>
  );
}