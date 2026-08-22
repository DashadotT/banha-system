import { supabase } from './supabase';
import type { EnvironmentalReading, Recording } from '../types';

export interface DashboardSummary {
  activeRecording: Recording | null;
  totalActiveRecordings: number;
  totalCompletedAssessments: number;
  pendingAssessmentDetails: number;
  latestReading: EnvironmentalReading | null;
  trend: EnvironmentalReading[];
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

  if (activeRecording) {
    const { data: trendData, error: trendErr } = await supabase
      .from('environmental_readings')
      .select('*')
      .eq('recording_id', activeRecording.id)
      .order('packet_number', { ascending: true });
    if (trendErr) throw trendErr;
    trend = (trendData ?? []) as EnvironmentalReading[];
    latestReading = trend.length ? trend[trend.length - 1] : null;
  } else {
    // Fall back to the most recent reading across the latest non-archived recording.
    const { data: recentRecordings, error: recentErr } = await supabase
      .from('recordings')
      .select('id')
      .eq('is_archived', false)
      .order('started_at', { ascending: false })
      .limit(1);
    if (recentErr) throw recentErr;
    const recentId = recentRecordings?.[0]?.id;
    if (recentId) {
      const { data: trendData, error: trendErr } = await supabase
        .from('environmental_readings')
        .select('*')
        .eq('recording_id', recentId)
        .order('packet_number', { ascending: true });
      if (trendErr) throw trendErr;
      trend = (trendData ?? []) as EnvironmentalReading[];
      latestReading = trend.length ? trend[trend.length - 1] : null;
    }
  }

  return {
    activeRecording,
    totalActiveRecordings: activeCount ?? 0,
    totalCompletedAssessments: completedCount ?? 0,
    pendingAssessmentDetails: pendingCount ?? 0,
    latestReading,
    trend,
  };
}
