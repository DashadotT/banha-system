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

export type RecordingStatus =
  | 'recording'
  | 'completed'
  | 'pending_assessment'
  | 'incomplete_assessment';

export interface RecordingAssessmentInfo {
  id: string;
  is_finalized: boolean;
  show_in_assessments: boolean;
  subject: string | null;
  section: string | null;
  group_type: GroupType | null;
  assessment_type: string | null;
  assessment_number: number | null;
}

/** Several recordings (possibly on different days) belonging to one assessment. */
export interface RecordingGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface Recording {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: RecordingStatus;
  is_archived: boolean;
  archived_at: string | null;
  archived_with_assessment?: boolean;
  group_id: string | null;
  notes: string | null;
  /** Where this session took place (can differ between recordings of one assessment). */
  classroom_type: string | null;
  class_schedule: string | null;
  created_at: string;
  group?: RecordingGroup | null;
  /** Assessment (own or group's) attached by the service layer, if any. */
  assessment_info?: RecordingAssessmentInfo | null;
  // Joined/derived (populated by service layer, not stored directly)
  latest_packet_number?: number;
  avg_temperature?: number | null;
  avg_noise?: number | null;
  assessment?: Assessment | null;
}

export interface EnvironmentalReading {
  id: string;
  recording_id: string;
  packet_number: number;
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
  /** Set for single-recording assessments; null when owned by a recording group. */
  recording_id: string | null;
  /** Set when the assessment spans a group of recordings. */
  group_id: string | null;
  // Every detail below may be null — assessment details can be saved partially.
  subject: string | null;
  section: string | null;
  group_type: GroupType | null;
  assessment_type: AssessmentType | null;
  assessment_number: number | null;
  assessment_date: string;
  class_average_score: number | null;
  total_possible_score: number | null;
  score_percentage: number | null;
  classroom_type: string | null;
  class_schedule: string | null;
  /** The assessment activity is finished and final results can be entered. */
  is_finalized: boolean;
  /** Published on the Assessments page. */
  show_in_assessments: boolean;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  // Joined/derived
  recording?: Recording | null;
  group?: RecordingGroup | null;
}

// ---------------------------------------------------------------------------
// System Settings — configurable option lists (Subjects, Sections, Assessment
// Types) managed from the Settings page and used to populate dropdowns
// throughout the Assessment form and filters.
// ---------------------------------------------------------------------------

export type SettingCategory =
  | 'subject'
  | 'section'
  | 'assessment_type'
  | 'classroom_type'
  | 'class_schedule';

export interface SettingOption {
  id: string;
  category: SettingCategory;
  value: string;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Activity Log — a running feed of research-data actions (recording
// start/stop, archive/restore, assessment changes, settings changes,
// account renames). Populated automatically by database triggers, so it
// captures both web-app and Node 2 (IoT) originated actions. Page
// navigation is never logged.
// ---------------------------------------------------------------------------

export type ActivityAction =
  | 'recording_started'
  | 'recording_stopped'
  | 'recording_archived'
  | 'recording_restored'
  | 'recording_deleted'
  | 'recording_grouped'
  | 'recording_ungrouped'
  | 'assessment_added'
  | 'assessment_updated'
  | 'assessment_archived'
  | 'assessment_restored'
  | 'assessment_deleted'
  | 'assessment_reset'
  | 'setting_added'
  | 'setting_renamed'
  | 'setting_archived'
  | 'setting_restored'
  | 'setting_deleted'
  | 'profile_renamed';

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: ActivityAction | string;
  entity_type: string;
  entity_label: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Environmental status thresholds (used across Dashboard / Live Monitoring)
// ---------------------------------------------------------------------------

export type EnvironmentalStatus = 'Normal' | 'Moderate' | 'Poor';

export interface EnvironmentalSnapshot {
  temperature: number | null;
  noise: number | null;
  recordedAt: string | null;
}
