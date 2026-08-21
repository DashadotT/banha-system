import { supabase } from './supabase';
import { Recording, EnvironmentalReading, RecordingWithDetails, Assessment } from '../types';

export async function getActiveRecording(): Promise<RecordingWithDetails | null> {
    try {
        const { data, error } = await supabase
            .from('recordings')
            .select(`
        *,
        device:devices(*),
        readings:environmental_readings(*)
      `)
            .eq('is_archived', false)
            .eq('status', 'Recording')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching active recording:', error);
            return null;
        }

        if (!data) return null;

        // Get assessment if exists
        const { data: assessmentData, error: assessmentError } = await supabase
            .from('assessments')
            .select('*')
            .eq('recording_id', data.id)
            .eq('is_archived', false)
            .maybeSingle();

        if (assessmentError) {
            console.error('Error fetching assessment for active recording:', assessmentError);
        }

        return {
            ...data,
            device: data.device,
            readings: data.readings || [],
            assessment: assessmentData || null,
        };
    } catch (err) {
        console.error('Error in getActiveRecording:', err);
        return null;
    }
}

export async function getRecordings(
    filters?: {
        status?: string;
        deviceId?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
    }
): Promise<RecordingWithDetails[]> {
    try {
        let query = supabase
            .from('recordings')
            .select(`
        *,
        device:devices(*)
      `)
            .eq('is_archived', false)
            .order('started_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.deviceId) {
            query = query.eq('device_id', filters.deviceId);
        }
        if (filters?.dateFrom) {
            query = query.gte('started_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('started_at', filters.dateTo);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching recordings:', error);
            throw error;
        }

        // Get readings and assessments for each recording
        const result: RecordingWithDetails[] = [];
        for (const rec of data || []) {
            // Get readings
            const { data: readings, error: readingsError } = await supabase
                .from('environmental_readings')
                .select('*')
                .eq('recording_id', rec.id)
                .order('packet_number', { ascending: true });

            if (readingsError) {
                console.error('Error fetching readings for recording:', readingsError);
            }

            // Get assessment
            const { data: assessment, error: assessmentError } = await supabase
                .from('assessments')
                .select('*')
                .eq('recording_id', rec.id)
                .eq('is_archived', false)
                .maybeSingle();

            if (assessmentError) {
                console.error('Error fetching assessment for recording:', assessmentError);
            }

            result.push({
                ...rec,
                device: rec.device,
                readings: readings || [],
                assessment: assessment || null,
            });
        }

        return result;
    } catch (err) {
        console.error('Error in getRecordings:', err);
        return [];
    }
}

export async function getRecordingById(id: string): Promise<RecordingWithDetails | null> {
    try {
        const { data, error } = await supabase
            .from('recordings')
            .select(`
        *,
        device:devices(*)
      `)
            .eq('id', id)
            .eq('is_archived', false)
            .maybeSingle();

        if (error) {
            console.error('Error fetching recording by id:', error);
            return null;
        }

        if (!data) return null;

        // Get readings
        const { data: readings, error: readingsError } = await supabase
            .from('environmental_readings')
            .select('*')
            .eq('recording_id', id)
            .order('packet_number', { ascending: true });

        if (readingsError) {
            console.error('Error fetching readings for recording:', readingsError);
        }

        // Get assessment
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select('*')
            .eq('recording_id', id)
            .eq('is_archived', false)
            .maybeSingle();

        if (assessmentError) {
            console.error('Error fetching assessment for recording:', assessmentError);
        }

        return {
            ...data,
            device: data.device,
            readings: readings || [],
            assessment: assessment || null,
        };
    } catch (err) {
        console.error('Error in getRecordingById:', err);
        return null;
    }
}

export async function archiveRecording(id: string): Promise<void> {
    const { error } = await supabase
        .from('recordings')
        .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
        })
        .eq('id', id);
    if (error) {
        console.error('Error archiving recording:', error);
        throw error;
    }
}

export async function restoreRecording(id: string): Promise<void> {
    const { error } = await supabase
        .from('recordings')
        .update({
            is_archived: false,
            archived_at: null,
        })
        .eq('id', id);
    if (error) {
        console.error('Error restoring recording:', error);
        throw error;
    }
}

export async function getReadingsForRecording(recordingId: string): Promise<EnvironmentalReading[]> {
    const { data, error } = await supabase
        .from('environmental_readings')
        .select('*')
        .eq('recording_id', recordingId)
        .order('packet_number', { ascending: true });
    if (error) {
        console.error('Error fetching readings:', error);
        throw error;
    }
    return data || [];
}

export async function getArchivedRecordings(): Promise<RecordingWithDetails[]> {
    try {
        const { data, error } = await supabase
            .from('recordings')
            .select(`
        *,
        device:devices(*)
      `)
            .eq('is_archived', true)
            .order('archived_at', { ascending: false });

        if (error) {
            console.error('Error fetching archived recordings:', error);
            throw error;
        }

        const result: RecordingWithDetails[] = [];
        for (const rec of data || []) {
            const { data: readings } = await supabase
                .from('environmental_readings')
                .select('*')
                .eq('recording_id', rec.id)
                .order('packet_number', { ascending: true });

            const { data: assessment } = await supabase
                .from('assessments')
                .select('*')
                .eq('recording_id', rec.id)
                .eq('is_archived', true)
                .maybeSingle();

            result.push({
                ...rec,
                device: rec.device,
                readings: readings || [],
                assessment: assessment || null,
            });
        }

        return result;
    } catch (err) {
        console.error('Error in getArchivedRecordings:', err);
        return [];
    }
}