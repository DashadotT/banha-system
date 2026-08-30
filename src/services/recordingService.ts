import { supabase } from './supabase';
import type { Device, EnvironmentalReading, Recording } from '../types';

/**
 * Fetches all non-archived recordings, most recent first, joined with device info.
 */
export async function fetchRecordings(): Promise<Recording[]> {
  const { data, error } = await supabase
    .from('recordings')
    .select('*, device:devices(*)')
    .eq('is_archived', false)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Recording[];
}

/**
 * Fetches a single recording by id (regardless of archive state), joined with device.
 */
export async function fetchRecordingById(id: string): Promise<Recording | null> {
  const { data, error } = await supabase
    .from('recordings')
    .select('*, device:devices(*)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Recording;
}

/**
 * Fetches the currently active (status = 'recording', non-archived) recording, if any.
 */
export async function fetchActiveRecording(): Promise<Recording | null> {
  const { data, error } = await supabase
    .from('recordings')
    .select('*, device:devices(*)')
    .eq('status', 'recording')
    .eq('is_archived', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Recording | null;
}

/**
 * Fetches all environmental readings for a recording, ordered by packet number.
 */
export async function fetchReadingsForRecording(
  recordingId: string
): Promise<EnvironmentalReading[]> {
  const { data, error } = await supabase
    .from('environmental_readings')
    .select('*')
    .eq('recording_id', recordingId)
    .order('packet_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EnvironmentalReading[];
}

/**
 * Fetches all devices.
 */
export async function fetchDevices(): Promise<Device[]> {
  const { data, error } = await supabase.from('devices').select('*').order('device_name');
  if (error) throw error;
  return (data ?? []) as Device[];
}

/**
 * Archives a recording (soft delete). Confirmation must be handled by the caller/UI.
 */
/**
 * Permanently deletes a recording and (via cascade) its environmental
 * readings and any assessment attached to it. Irreversible — only intended
 * for use from Archived Records, after the person confirms they understand
 * this cannot be undone. Prefer archiveRecording for normal use.
 */
export async function deleteRecordingPermanently(id: string): Promise<void> {
  const { error } = await supabase.from('recordings').delete().eq('id', id);
  if (error) throw error;
}

export async function archiveRecording(id: string): Promise<void> {
  const { error } = await supabase
    .from('recordings')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Restores a previously archived recording so it re-enters all active queries.
 */
export async function restoreRecording(id: string): Promise<void> {
  const { error } = await supabase
    .from('recordings')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Fetches archived recordings only, for the Archived Records page.
 */
export async function fetchArchivedRecordings(): Promise<Recording[]> {
  const { data, error } = await supabase
    .from('recordings')
    .select('*, device:devices(*)')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Recording[];
}

/**
 * Subscribes to realtime INSERT events on environmental_readings for a given
 * recording, so Live Monitoring updates automatically as new packets arrive.
 */
export function subscribeToReadings(
  recordingId: string,
  onInsert: (reading: EnvironmentalReading) => void
) {
  const channel = supabase
    .channel(`readings-${recordingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'environmental_readings',
        filter: `recording_id=eq.${recordingId}`,
      },
      (payload) => onInsert(payload.new as EnvironmentalReading)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to realtime changes on the recordings table (e.g. START/STOP
 * events flipping status), so the Dashboard / Live Monitoring pages can react.
 */
export function subscribeToRecordings(onChange: (recording: Recording) => void) {
  const channel = supabase
    .channel('recordings-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recordings' },
      (payload) => onChange(payload.new as Recording)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
