-- =============================================================================
-- BANHA — Teardown / Drop Script
-- =============================================================================
-- WARNING: THIS IS DESTRUCTIVE. Running this permanently deletes every BANHA
-- table and all data in them (recordings, environmental readings,
-- assessments, settings options, devices, profiles, activity log). There is
-- no undo.
--
-- Use this only when you want to completely reset the database before
-- re-running 01_schema.sql, 02_activity_log.sql, and 03_seed.sql from
-- scratch.
-- =============================================================================


-- =============================================================================
-- REMOVE TABLES FROM REALTIME PUBLICATION
-- =============================================================================

do $$
begin

  begin
    alter publication supabase_realtime
    drop table public.environmental_readings;
  exception
    when undefined_object then
      null;
  end;

  begin
    alter publication supabase_realtime
    drop table public.recordings;
  exception
    when undefined_object then
      null;
  end;

  begin
    alter publication supabase_realtime
    drop table public.activity_log;
  exception
    when undefined_object then
      null;
  end;

end;
$$;


-- =============================================================================
-- DROP VIEW
-- =============================================================================

drop view if exists public.recording_summary;


-- =============================================================================
-- DROP POLICIES
-- =============================================================================

drop policy if exists "Authenticated users can view profiles"
on public.profiles;

drop policy if exists "Users can update their own profile"
on public.profiles;

drop policy if exists "Authenticated users can view devices"
on public.devices;

drop policy if exists "Authenticated users can manage recordings"
on public.recordings;

drop policy if exists "Authenticated users can manage readings"
on public.environmental_readings;

drop policy if exists "Authenticated users can manage assessments"
on public.assessments;

drop policy if exists "Authenticated users can manage settings options"
on public.settings_options;

drop policy if exists "IoT can view devices"
on public.devices;

drop policy if exists "IoT can create recordings"
on public.recordings;

drop policy if exists "IoT can view recordings"
on public.recordings;

drop policy if exists "IoT can update recordings"
on public.recordings;

drop policy if exists "IoT can insert readings"
on public.environmental_readings;

drop policy if exists "IoT can view readings"
on public.environmental_readings;

drop policy if exists "Authenticated users can view activity log"
on public.activity_log;


-- =============================================================================
-- DROP TRIGGERS
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists before_recording_stop on public.recordings;
drop trigger if exists on_assessment_created on public.assessments;
drop trigger if exists trg_log_recording_insert on public.recordings;
drop trigger if exists trg_log_recording_update on public.recordings;
drop trigger if exists trg_log_recording_delete on public.recordings;
drop trigger if exists trg_log_assessment_insert on public.assessments;
drop trigger if exists trg_log_assessment_update on public.assessments;
drop trigger if exists trg_log_assessment_delete on public.assessments;
drop trigger if exists trg_log_settings_insert on public.settings_options;
drop trigger if exists trg_log_settings_update on public.settings_options;
drop trigger if exists trg_log_profile_update on public.profiles;


-- =============================================================================
-- DROP FUNCTIONS
-- =============================================================================

drop function if exists public.handle_new_user();
drop function if exists public.set_recording_end_time();
drop function if exists public.mark_recording_assessed();
drop function if exists public.log_recording_activity();
drop function if exists public.log_assessment_activity();
drop function if exists public.log_settings_activity();
drop function if exists public.log_profile_activity();
drop function if exists public.log_activity(text, text, text);


-- =============================================================================
-- DROP TABLES
-- Dropped in dependency-safe order (children before/with their parents).
-- "cascade" also removes any leftover foreign-key-dependent objects.
-- =============================================================================

drop table if exists public.environmental_readings cascade;
drop table if exists public.assessments cascade;
drop table if exists public.recordings cascade;
drop table if exists public.settings_options cascade;
drop table if exists public.devices cascade;
drop table if exists public.activity_log cascade;
drop table if exists public.profiles cascade;


-- =============================================================================
-- EXTENSION
-- Left in place by default since other parts of your Supabase project may
-- depend on it. Uncomment if you're certain nothing else uses it.
-- =============================================================================

-- drop extension if exists "uuid-ossp";
