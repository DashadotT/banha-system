// src/pages/LiveMonitoring.tsx

import { useEffect, useState } from 'react';

import { Radio } from 'lucide-react';

import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EnvironmentalCards } from '../components/dashboard/EnvironmentalCards';
import { TrendChart } from '../components/charts/TrendChart';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/common/States';

import { useAsync } from '../hooks/useAsync';

import {
  fetchActiveRecording,
  fetchReadingsForRecording,
  subscribeToReadings,
  subscribeToRecordings,
  fetchServerTime,
} from '../services/recordingService';

import type {
  EnvironmentalReading,
  Recording,
} from '../types';

import {
  elapsedSecondsFromServer,
  formatDateTime,
  formatDuration,
  timeAgo,
} from '../utils/dateTime';

export default function LiveMonitoring() {
  const {
    data: initialRecording,
    loading,
    error,
    refetch,
  } = useAsync(fetchActiveRecording);

  const [recording, setRecording] =
    useState<Recording | null>(null);

  const [readings, setReadings] =
    useState<EnvironmentalReading[]>([]);

  /*
   * Server-time synchronization
   *
   * serverNowMs:
   *   Supabase server time when synchronized.
   *
   * performanceStartMs:
   *   Browser monotonic timer captured at the same moment.
   *
   * performance.now() is used only for measuring elapsed time
   * between ticks. It does NOT depend on the computer's clock.
   */
  const [serverNowMs, setServerNowMs] =
    useState<number | null>(null);

  const [performanceStartMs, setPerformanceStartMs] =
    useState<number | null>(null);

  const [, forceTick] = useState(0);

  /*
   * Set active recording from initial request.
   */
  useEffect(() => {
    setRecording(initialRecording ?? null);
  }, [initialRecording]);

  /*
   * Synchronize the dashboard with Supabase server time
   * whenever an active recording is detected.
   */
  useEffect(() => {
    if (!recording || recording.status !== 'recording') {
      setServerNowMs(null);
      setPerformanceStartMs(null);
      return;
    }

    let cancelled = false;

    const synchronizeServerTime = async () => {
      try {
        const serverTime = await fetchServerTime();

        if (cancelled) return;

        setServerNowMs(serverTime);
        setPerformanceStartMs(performance.now());
      } catch (err) {
        console.error(
          'Failed to synchronize server time:',
          err
        );
      }
    };

    synchronizeServerTime();

    return () => {
      cancelled = true;
    };
  }, [recording?.id, recording?.status]);

  /*
   * Load readings for the active recording,
   * then subscribe to realtime updates.
   */
  useEffect(() => {
    if (!recording) {
      setReadings([]);
      return;
    }

    let cancelled = false;

    fetchReadingsForRecording(recording.id).then((data) => {
      if (!cancelled) {
        setReadings(data);
      }
    });

    const unsubscribe = subscribeToReadings(
      recording.id,
      (reading) => {
        setReadings((prev) => [...prev, reading]);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [recording]);

  /*
   * Subscribe to recording START/STOP changes globally.
   */
  useEffect(() => {
    const unsubscribe = subscribeToRecordings(
      (updated) => {
        if (
          updated.status === 'recording' &&
          !updated.is_archived
        ) {
          setRecording(updated);
        } else if (
          recording &&
          updated.id === recording.id
        ) {
          refetch();
        }
      }
    );

    return unsubscribe;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Refresh the live timer every second.
   *
   * This does NOT calculate the duration.
   *
   * It only causes React to render again.
   * elapsedSecondsFromServer() then calculates the
   * current duration using the synchronized server time.
   */
  useEffect(() => {
    if (
      !recording ||
      recording.status !== 'recording'
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      forceTick((t) => t + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [recording?.id, recording?.status]);

  const latest =
    readings.length > 0
      ? readings[readings.length - 1]
      : null;

  /*
   * Calculate live duration.
   *
   * If server synchronization has not completed yet,
   * show 00:00:00 rather than using the computer clock.
   */
  const liveDuration =
    recording &&
      serverNowMs !== null &&
      performanceStartMs !== null
      ? elapsedSecondsFromServer(
        recording.started_at,
        serverNowMs,
        performanceStartMs
      )
      : 0;

  return (
    <AppLayout title="Live Monitoring">
      {loading && (
        <LoadingState label="Checking for active recordings…" />
      )}

      {error && (
        <ErrorState
          message={error}
          onRetry={refetch}
        />
      )}

      {!loading &&
        !error &&
        !recording && (
          <EmptyState
            icon={<Radio size={28} />}
            title="No active recording"
            description="Live environmental data will appear here as soon as a BANHA device starts a recording session."
          />
        )}

      {recording && (
        <div className="space-y-6">
          <Card className="border-primary-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {recording.device?.device_name ?? '—'}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Started {formatDateTime(recording.started_at)}
                </p>
              </div>

              <Badge tone="accent" dot>
                RECORDING
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* DURATION */}
              <div>
                <p className="text-xs text-slate-500">
                  Duration
                </p>

                <p className="mono-num mt-0.5 text-lg font-semibold text-primary">
                  {formatDuration(liveDuration)}
                </p>
              </div>

              {/* LATEST PACKET */}
              <div>
                <p className="text-xs text-slate-500">
                  Latest Packet
                </p>

                <p className="mono-num mt-0.5 text-lg font-semibold text-primary">
                  #{latest?.packet_number ?? '—'}
                </p>
              </div>

              {/* LAST UPDATED */}
              <div>
                <p className="text-xs text-slate-500">
                  Last Updated
                </p>

                <p className="mt-0.5 text-sm font-medium text-primary">
                  {latest
                    ? timeAgo(latest.recorded_at)
                    : '—'}
                </p>
              </div>

              {/* DEVICE ID */}
              <div>
                <p className="text-xs text-slate-500">
                  Device ID
                </p>

                <p className="mt-0.5 text-sm font-medium text-primary">
                  {recording.device_id
                    ? recording.device_id.slice(0, 8)
                    : '—'}
                </p>
              </div>
            </div>
          </Card>

          <EnvironmentalCards
            temperature={
              latest?.average_temperature ?? null
            }
            noise={latest?.average_noise ?? null}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Temperature Trend"
                subtitle="degrees Celsius (°C)"
              />

              {readings.length === 0 ? (
                <EmptyState
                  title="Waiting for data"
                  description="No packets received yet."
                />
              ) : (
                <TrendChart
                  data={readings}
                  metric="average_temperature"
                  color="#678EC4"
                  unit="°C"
                />
              )}
            </Card>

            <Card>
              <CardHeader
                title="Noise Trend"
                subtitle="decibels (dB)"
              />

              {readings.length === 0 ? (
                <EmptyState
                  title="Waiting for data"
                  description="No packets received yet."
                />
              ) : (
                <TrendChart
                  data={readings}
                  metric="average_noise"
                  color="#DEAE20"
                  unit="dB"
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}