import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EnvironmentalCards } from '../components/dashboard/EnvironmentalCards';
import { TrendChart } from '../components/charts/TrendChart';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import {
  fetchActiveRecording,
  fetchReadingsForRecording,
  subscribeToReadings,
  subscribeToRecordings,
} from '../services/recordingService';
import type { EnvironmentalReading, Recording } from '../types';
import { elapsedSeconds, formatDateTime, formatDuration, timeAgo } from '../utils/dateTime';

export default function LiveMonitoring() {
  const { data: initialRecording, loading, error, refetch } = useAsync(fetchActiveRecording);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    setRecording(initialRecording ?? null);
  }, [initialRecording]);

  // Load readings for the active recording, then subscribe for realtime updates.
  useEffect(() => {
    if (!recording) {
      setReadings([]);
      return;
    }
    let cancelled = false;
    fetchReadingsForRecording(recording.id).then((data) => {
      if (!cancelled) setReadings(data);
    });
    const unsubscribe = subscribeToReadings(recording.id, (reading) => {
      setReadings((prev) => [...prev, reading]);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [recording]);

  // Subscribe to recording status changes (START/STOP events) globally.
  useEffect(() => {
    const unsubscribe = subscribeToRecordings((updated) => {
      if (updated.status === 'recording' && !updated.is_archived) {
        setRecording(updated);
      } else if (recording && updated.id === recording.id) {
        refetch();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recording || recording.status !== 'recording') return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const latest = readings.length ? readings[readings.length - 1] : null;

  return (
    <AppLayout title="Live Monitoring">
      {loading && <LoadingState label="Checking for active recordings…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && !recording && (
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
                  {recording.device?.device_name ?? 'Unknown device'}
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
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="mono-num mt-0.5 text-lg font-semibold text-primary">
                  {formatDuration(elapsedSeconds(recording.started_at))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Latest Packet</p>
                <p className="mono-num mt-0.5 text-lg font-semibold text-primary">
                  #{latest?.packet_number ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="mt-0.5 text-sm font-medium text-primary">
                  {latest ? timeAgo(latest.recorded_at) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Device ID</p>
                <p className="mt-0.5 text-sm font-medium text-primary">
                  {recording.device_id.slice(0, 8)}
                </p>
              </div>
            </div>
          </Card>

          <EnvironmentalCards
            co2={latest?.average_co2 ?? null}
            temperature={latest?.average_temperature ?? null}
            noise={latest?.average_noise ?? null}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader title="CO₂ Trend" subtitle="parts per million (ppm)" />
              {readings.length === 0 ? (
                <EmptyState title="Waiting for data" description="No packets received yet." />
              ) : (
                <TrendChart data={readings} metric="average_co2" color="#002858" unit="ppm" />
              )}
            </Card>
            <Card>
              <CardHeader title="Temperature Trend" subtitle="degrees Celsius (°C)" />
              {readings.length === 0 ? (
                <EmptyState title="Waiting for data" description="No packets received yet." />
              ) : (
                <TrendChart data={readings} metric="average_temperature" color="#678EC4" unit="°C" />
              )}
            </Card>
            <Card>
              <CardHeader title="Noise Trend" subtitle="decibels (dB)" />
              {readings.length === 0 ? (
                <EmptyState title="Waiting for data" description="No packets received yet." />
              ) : (
                <TrendChart data={readings} metric="average_noise" color="#DEAE20" unit="dB" />
              )}
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
