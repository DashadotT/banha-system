import { supabase } from './supabase';
import type { ActivityLogEntry } from '../types';

/**
 * Fetches the most recent activity log entries, newest first. Entries are
 * created automatically by database triggers whenever a recording,
 * assessment, setting, or profile name changes — never on page navigation.
 */
export async function fetchRecentActivity(limit = 12): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityLogEntry[];
}
