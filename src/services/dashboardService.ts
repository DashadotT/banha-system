import { supabase } from './supabase';
import type { EnvironmentalReading, Recording } from '../types';

export type DashboardDataSource = 'live' | 'recent' | 'none';

export interface DashboardSummary {
  activeRecording: Recording | null;
  totalActiveRecordings: number;
  totalCompletedAssessments: number;
  pendingAssessmentDetails: number;
  latestReading: EnvironmentalReading | null;
  trend: EnvironmentalReading[];
  /**
   * Tells the UI whether the shown values are actively streaming or
   * historical, so the page can always label them correctly instead of
   * silently showing old data as if it were current:
   *   'live'   — an active recording with at least one packet received.
   *   'recent' — no live data right now (idle, or a new recording still
   *              waiting for its first packet) — values shown are the
   *              last known reading from the most recent recording.
   *   'none'   — nothing has ever been recorded.
   */
  dataSource: DashboardDataSource;
}

/**
 * Fetches the latest environmental readings for the most recent non-archived
 * recording (regardless of which one), used as a "last known values"
 * fallback so the Dashboard never has to show a blank state between the
 * previous recording ending and the next one's first packet arriving.
 */
async function fetchLatestKnownTrend(excludeRecordingId?: string) {
  let query = supabase
    .from('recordings')
    .select('id')
    .eq('is_archived', false)
    .order('started_at', { ascending: false })
    .limit(5);
  const { data: recentRecordings, error: recentErr } = await query;
  if (recentErr) throw recentErr;

  const candidateId = (recentRecordings ?? []).find((r) => r.id !== excludeRecordingId)?.id;
  if (!candidateId) return { trend: [] as EnvironmentalReading[], latestReading: null };

  const { data: trendData, error: trendErr } = await supabase
    .from('environmental_readings')
    .select('*')
    .eq('recording_id', candidateId)
    .order('packet_number', { ascending: true });
  if (trendErr) throw trendErr;
  const trend = (trendData ?? []) as EnvironmentalReading[];
  return { trend, latestReading: trend.length ? trend[trend.length - 1] : null };
}

/**
 * Assembles the Dashboard's summary cards and trend chart data.
 * All counts exclude archived recordings/assessments.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const [
    { data: activeRecordings, error: activeErr },
    { count: activeCount, error: activeCountErr },
    { count: completedCount, error: completedErr },
    { count: pendingCount, error: pendingErr },
  ] = await Promise.all([
    supabase
      .from('recordings')
      .select('*, device:devices(*)')
      .eq('status', 'recording')
      .eq('is_archived', false)
      .order('started_at', { ascending: false })
      .limit(1),
    supabase
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'recording')
      .eq('is_archived', false),
    supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false),
    supabase
      .from('recordings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_assessment')
      .eq('is_archived', false),
  ]);

  if (activeErr) throw activeErr;
  if (activeCountErr) throw activeCountErr;
  if (completedErr) throw completedErr;
  if (pendingErr) throw pendingErr;

  const activeRecording = (activeRecordings?.[0] as Recording | undefined) ?? null;

  let latestReading: EnvironmentalReading | null = null;
  let trend: EnvironmentalReading[] = [];
  let dataSource: DashboardDataSource = 'none';

  if (activeRecording) {
    const { data: trendData, error: trendErr } = await supabase
      .from('environmental_readings')
      .select('*')
      .eq('recording_id', activeRecording.id)
      .order('packet_number', { ascending: true });
    if (trendErr) throw trendErr;
    trend = (trendData ?? []) as EnvironmentalReading[];
    latestReading = trend.length ? trend[trend.length - 1] : null;

    if (latestReading) {
      dataSource = 'live';
    } else {
      // A new recording just started but hasn't sent its first packet yet —
      // keep showing the previous recording's last known values instead of
      // going blank, clearly labeled as "recent" (not live) in the UI.
      const fallback = await fetchLatestKnownTrend(activeRecording.id);
      trend = fallback.trend;
      latestReading = fallback.latestReading;
      dataSource = latestReading ? 'recent' : 'none';
    }
  } else {
    const fallback = await fetchLatestKnownTrend();
    trend = fallback.trend;
    latestReading = fallback.latestReading;
    dataSource = latestReading ? 'recent' : 'none';
  }

  return {
    activeRecording,
    totalActiveRecordings: activeCount ?? 0,
    totalCompletedAssessments: completedCount ?? 0,
    pendingAssessmentDetails: pendingCount ?? 0,
    latestReading,
    trend,
    dataSource,
  };
}