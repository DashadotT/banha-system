// src/services/recordingService.ts

import { supabase } from './supabase';

import type {
  Device,
  EnvironmentalReading,
  Recording,
} from '../types';

/**
 * Fetches all non-archived recordings, most recent first,
 * joined with device info.
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
 * Fetches a single recording by id
 * (regardless of archive state), joined with device.
 */
export async function fetchRecordingById(
  id: string
): Promise<Recording | null> {
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
 * Fetches the currently active recording
 * (status = 'recording', non-archived).
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
 * Fetches all environmental readings for a recording,
 * ordered by packet number.
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
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('device_name');

  if (error) throw error;

  return (data ?? []) as Device[];
}

/**
 * Archives a recording (soft delete).
 * Confirmation must be handled by the caller/UI.
 */
export async function archiveRecording(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('recordings')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently deletes a recording.
 *
 * Via database cascade, this also deletes:
 * - environmental readings
 * - assessment attached to the recording
 *
 * Irreversible.
 */
export async function deleteRecordingPermanently(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Restores a previously archived recording.
 */
export async function restoreRecording(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('recordings')
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Fetches archived recordings only.
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
 * Subscribes to realtime INSERT events on environmental_readings
 * for a given recording.
 *
 * This allows Live Monitoring to update automatically
 * when new sensor packets arrive.
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
      (payload) => {
        onInsert(payload.new as EnvironmentalReading);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to realtime changes on the recordings table.
 *
 * Used for:
 * - START events
 * - STOP events
 * - status changes
 * - recording updates
 */
export function subscribeToRecordings(
  onChange: (recording: Recording) => void
) {
  const channel = supabase
    .channel('recordings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recordings',
      },
      (payload) => {
        onChange(payload.new as Recording);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetches the authoritative current time from
 * the Supabase/PostgreSQL server.
 *
 * This is used by the live recording timer so that
 * recording duration does not depend on the computer's
 * system clock.
 *
 * Returns:
 *   Server timestamp in milliseconds.
 */
export async function fetchServerTime(): Promise<number> {
  const { data, error } = await supabase.rpc(
    'get_server_time'
  );

  if (error) {
    throw error;
  }

  const serverDate = new Date(data);

  if (Number.isNaN(serverDate.getTime())) {
    throw new Error(
      'Supabase returned an invalid server timestamp.'
    );
  }

  return serverDate.getTime();
}