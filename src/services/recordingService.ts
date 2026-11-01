// src/services/recordingService.ts

import { supabase } from './supabase';

import { deriveUnits } from '../utils/assessmentUnits';
import { STATE_TO_STATUS } from '../utils/assessment';
import type {
  Assessment,
  EnvironmentalReading,
  Recording,
  RecordingGroup,
} from '../types';

const RECORDING_SELECT = '*, group:recording_groups(id, name, created_at)';

/**
 * Fetches all non-archived recordings, most recent first.
 */
export async function fetchRecordings(): Promise<Recording[]> {
  const { data, error } = await supabase
    .from('recordings')
    .select(RECORDING_SELECT)
    .eq('is_archived', false)
    .order('started_at', { ascending: false });

  if (error) throw error;

  const recordings = (data ?? []) as Recording[];
  if (recordings.length === 0) return recordings;

  // Attach each recording's assessment info and derive its status from the
  // completeness of its assessment (own or group's), so the list always
  // matches the Dashboard and never depends on a stale stored status.
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('*')
    .eq('is_archived', false);
  if (assessmentsError) throw assessmentsError;

  const active = (assessments ?? []) as Assessment[];
  const units = deriveUnits(
    recordings.filter((r) => r.status !== 'recording'),
    active
  );
  const unitByRecording = new Map<string, (typeof units)[number]>();
  units.forEach((u) => u.recordings.forEach((r) => unitByRecording.set(r.id, u)));

  return recordings.map((r) => {
    const unit = unitByRecording.get(r.id);
    const a = unit?.assessment ?? null;
    return {
      ...r,
      status: unit ? STATE_TO_STATUS[unit.state] : r.status,
      assessment_info: a
        ? {
            id: a.id,
            is_finalized: a.is_finalized,
            show_in_assessments: a.show_in_assessments,
            subject: a.subject,
            section: a.section,
            group_type: a.group_type,
            assessment_type: a.assessment_type,
            assessment_number: a.assessment_number,
          }
        : null,
    };
  });
}

/**
 * Fetches a single recording by id (regardless of archive state).
 */
export async function fetchRecordingById(
  id: string
): Promise<Recording | null> {
  const { data, error } = await supabase
    .from('recordings')
    .select(RECORDING_SELECT)
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
    .select('*')
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
 * Archives a recording (soft delete).
 * Confirmation must be handled by the caller/UI.
 */
export async function archiveRecording(
  id: string
): Promise<void> {
  await archiveRecordings([id]);
}

/**
 * Archives several recordings at once. Sensor readings, group membership and
 * assessment details are all preserved.
 */
export async function archiveRecordings(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('recordings')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_with_assessment: false,
    })
    .in('id', ids);

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
      archived_with_assessment: false,
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
    .select(RECORDING_SELECT)
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


/** Saves (or clears, when empty) the free-text note on a recording. */
export async function updateRecordingNote(id: string, note: string): Promise<void> {
  const trimmed = note.trim();
  const { error } = await supabase
    .from('recordings')
    .update({ notes: trimmed === '' ? null : trimmed })
    .eq('id', id);
  if (error) throw error;
}

/** All recording groups, alphabetically — used by pickers and filters. */
export async function fetchRecordingGroups(): Promise<RecordingGroup[]> {
  const { data, error } = await supabase
    .from('recording_groups')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecordingGroup[];
}

/**
 * Groups recordings under one assessment. Pass `groupId` to add to an
 * existing group, or `groupName` to create a new one. Recording dates and
 * sensor readings are never modified.
 */
export async function groupRecordings(
  recordingIds: string[],
  target: { groupId: string } | { groupName: string }
): Promise<string> {
  const { data, error } = await supabase.rpc('group_recordings', {
    p_recording_ids: recordingIds,
    p_group_id: 'groupId' in target ? target.groupId : null,
    p_group_name: 'groupName' in target ? target.groupName : null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Removes a recording from its group (recording and readings are kept). */
export async function ungroupRecording(recordingId: string): Promise<void> {
  const { error } = await supabase.rpc('ungroup_recording', { p_recording_id: recordingId });
  if (error) throw new Error(error.message);
}

/** Recordings that belong to a group, oldest first (archived ones included). */
export async function fetchRecordingsInGroup(groupId: string): Promise<Recording[]> {
  const { data, error } = await supabase
    .from('recordings')
    .select(RECORDING_SELECT)
    .eq('group_id', groupId)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Recording[];
}

/** Saves where/when this session took place. Only this recording is changed. */
export async function updateRecordingSession(
  id: string,
  session: { classroom_type: string | null; class_schedule: string | null }
): Promise<void> {
  const { error } = await supabase.from('recordings').update(session).eq('id', id);
  if (error) throw error;
}

/** Raw readings of several recordings (for combined means across a group). */
export async function fetchReadingsForRecordings(ids: string[]): Promise<EnvironmentalReading[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('environmental_readings')
    .select('*')
    .in('recording_id', ids)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EnvironmentalReading[];
}
