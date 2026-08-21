// src/types/index.ts
export interface Profile {
    id: string;
    full_name: string;
    role: 'Administrator' | 'Researcher';
    created_at: string;
}

export interface Device {
    id: string;
    device_name: string;
    node_number: number;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Recording {
    id: string;
    device_id: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    status: 'Recording' | 'Completed' | 'Pending Assessment Details';
    is_archived: boolean;
    archived_at: string | null;
    created_at: string;
    device?: Device;
    assessments?: Assessment[];
}

export interface EnvironmentalReading {
    id: string;
    recording_id: string;
    packet_number: number;
    average_co2: number;
    average_temperature: number;
    average_noise: number;
    recorded_at: string;
    created_at: string;
}

export interface Assessment {
    id: string;
    recording_id: string;
    subject: string;
    section: string;
    group_type: 'Experimental' | 'Comparison';
    assessment_type: 'Quiz' | 'Examination' | 'Activity' | 'Exercise';
    assessment_name: string;
    assessment_date: string;
    class_average_score: number;
    total_possible_score: number;
    score_percentage: number;
    is_archived: boolean;
    archived_at: string | null;
    created_at: string;
    recording?: Recording;
}

export interface RecordingWithDetails extends Recording {
    device: Device;
    readings: EnvironmentalReading[];
    assessment: Assessment | null;
}

export interface CorrelationResult {
    variable1: string;
    variable2: string;
    n: number;
    r: number;
    p_value: number;
    significance: 'significant' | 'not significant';
    interpretation: string;
}

export interface TTestResult {
    subject: string;
    experimental_n: number;
    comparison_n: number;
    experimental_mean: number;
    comparison_mean: number;
    t_value: number;
    df: number;
    p_value: number;
    significance: 'significant' | 'not significant';
    decision: string;
    interpretation: string;
}

export interface ArchiveItem {
    id: string;
    type: 'recording' | 'assessment';
    name: string;
    archived_at: string;
    original_date: string;
    status: string;
    data: Recording | Assessment;
}