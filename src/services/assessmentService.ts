import { supabase } from './supabase';
import { Assessment } from '../types';

export async function createAssessment(data: Omit<Assessment, 'id' | 'created_at' | 'is_archived' | 'archived_at'>): Promise<Assessment> {
    const { data: result, error } = await supabase
        .from('assessments')
        .insert({
            recording_id: data.recording_id,
            subject: data.subject,
            section: data.section,
            group_type: data.group_type,
            assessment_type: data.assessment_type,
            assessment_name: data.assessment_name,
            assessment_date: data.assessment_date,
            class_average_score: data.class_average_score,
            total_possible_score: data.total_possible_score,
            score_percentage: data.score_percentage,
            is_archived: false,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating assessment:', error);
        throw error;
    }

    // Update recording status
    const { error: updateError } = await supabase
        .from('recordings')
        .update({ status: 'Completed' })
        .eq('id', data.recording_id);

    if (updateError) {
        console.error('Error updating recording status:', updateError);
    }

    return result;
}

export async function getAssessments(
    filters?: {
        subject?: string;
        section?: string;
        group_type?: string;
        assessment_type?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
    }
): Promise<Assessment[]> {
    let query = supabase
        .from('assessments')
        .select(`
      *,
      recording:recordings(
        *,
        device:devices(*),
        readings:environmental_readings(*)
      )
    `)
        .eq('is_archived', false)
        .order('assessment_date', { ascending: false });

    if (filters?.subject) {
        query = query.eq('subject', filters.subject);
    }
    if (filters?.section) {
        query = query.eq('section', filters.section);
    }
    if (filters?.group_type) {
        query = query.eq('group_type', filters.group_type);
    }
    if (filters?.assessment_type) {
        query = query.eq('assessment_type', filters.assessment_type);
    }
    if (filters?.dateFrom) {
        query = query.gte('assessment_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte('assessment_date', filters.dateTo);
    }
    if (filters?.search) {
        query = query.ilike('assessment_name', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching assessments:', error);
        throw error;
    }
    return data || [];
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
    const { data, error } = await supabase
        .from('assessments')
        .select(`
      *,
      recording:recordings(
        *,
        device:devices(*),
        readings:environmental_readings(*)
      )
    `)
        .eq('id', id)
        .eq('is_archived', false)
        .maybeSingle();

    if (error) {
        console.error('Error fetching assessment:', error);
        return null;
    }
    return data;
}

export async function archiveAssessment(id: string): Promise<void> {
    const { error } = await supabase
        .from('assessments')
        .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
        })
        .eq('id', id);
    if (error) {
        console.error('Error archiving assessment:', error);
        throw error;
    }
}

export async function restoreAssessment(id: string): Promise<void> {
    const { error } = await supabase
        .from('assessments')
        .update({
            is_archived: false,
            archived_at: null,
        })
        .eq('id', id);
    if (error) {
        console.error('Error restoring assessment:', error);
        throw error;
    }
}

export async function getArchivedAssessments(): Promise<Assessment[]> {
    const { data, error } = await supabase
        .from('assessments')
        .select(`
      *,
      recording:recordings(
        *,
        device:devices(*),
        readings:environmental_readings(*)
      )
    `)
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

    if (error) {
        console.error('Error fetching archived assessments:', error);
        throw error;
    }
    return data || [];
}

export async function getDistinctSubjects(): Promise<string[]> {
    const { data, error } = await supabase
        .from('assessments')
        .select('subject')
        .eq('is_archived', false);
    if (error) {
        console.error('Error fetching distinct subjects:', error);
        throw error;
    }
    const subjects = new Set(data?.map(d => d.subject) || []);
    return Array.from(subjects);
}

export async function getDistinctSections(): Promise<string[]> {
    const { data, error } = await supabase
        .from('assessments')
        .select('section')
        .eq('is_archived', false);
    if (error) {
        console.error('Error fetching distinct sections:', error);
        throw error;
    }
    const sections = new Set(data?.map(d => d.section) || []);
    return Array.from(sections);
}

// Get assessments for a specific recording
export async function getAssessmentsByRecordingId(recordingId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('is_archived', false);

    if (error) {
        console.error('Error fetching assessments for recording:', error);
        throw error;
    }
    return data || [];
}