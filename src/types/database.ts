// ---------------------------------------------------------------------------
// BANHA — Core database types
// These interfaces mirror the Supabase Postgres schema described in
// supabase/schema.sql. Keep them in sync with any migration changes.
// ---------------------------------------------------------------------------

export type UserRole = 'administrator' | 'researcher';
export type AccountStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
}

export type DeviceStatus = 'online' | 'offline' | 'recording';

export interface Device {
  id: string;
  device_name: string;
  node_number: number;
  status: DeviceStatus;
  created_at: string;
}

export type RecordingStatus = 'recording' | 'completed' | 'pending_assessment';

export interface Recording {
  id: string;
  device_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: RecordingStatus;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  // Joined/derived (populated by service layer, not stored directly)
  device?: Device | null;
  latest_packet_number?: number;
  avg_co2?: number | null;
  avg_temperature?: number | null;
  avg_noise?: number | null;
  assessment?: Assessment | null;
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

export type GroupType = 'Experimental' | 'Comparison';

/** Assessment types are now user-configurable via System Settings, so this is
 * a plain string rather than a fixed union. See SettingOption / SettingCategory. */
export type AssessmentType = string;

export interface Assessment {
  id: string;
  recording_id: string;
  subject: string;
  section: string;
  group_type: GroupType;
  assessment_type: AssessmentType;
  assessment_number: number;
  assessment_date: string;
  class_average_score: number;
  total_possible_score: number;
  score_percentage: number;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  // Joined/derived
  recording?: Recording;
}

// ---------------------------------------------------------------------------
// System Settings — configurable option lists (Subjects, Sections, Assessment
// Types) managed from the Settings page and used to populate dropdowns
// throughout the Assessment form and filters.
// ---------------------------------------------------------------------------

export type SettingCategory = 'subject' | 'section' | 'assessment_type';

export interface SettingOption {
  id: string;
  category: SettingCategory;
  value: string;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Environmental status thresholds (used across Dashboard / Live Monitoring)
// ---------------------------------------------------------------------------

export type EnvironmentalStatus = 'Normal' | 'Moderate' | 'Poor';

export interface EnvironmentalSnapshot {
  co2: number | null;
  temperature: number | null;
  noise: number | null;
  recordedAt: string | null;
}
