-- =============================================================================
-- BANHA — Activity Log
-- Run this after 01_schema.sql (order relative to 03_seed.sql doesn't matter).
-- Captures a running feed of research-data actions — recording start/stop,
-- archive/restore, assessment add/edit, settings changes, account renames —
-- for the Dashboard's Activity Log widget. Page navigation is never logged.
--
-- Triggers fire regardless of who performed the action, so both the web app
-- (authenticated users) and Node 2 (writing via the anon key) are captured
-- automatically without any extra work in the application code.
-- =============================================================================


-- =============================================================================
-- ACTIVITY_LOG TABLE
-- =============================================================================

create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),

  actor_id uuid references auth.users(id) on delete set null,

  actor_name text not null default 'BANHA Device (Node 2)',

  action text not null,

  entity_type text not null,

  entity_label text,

  created_at timestamptz not null default now()
);


create index if not exists idx_activity_log_created_at
on public.activity_log(created_at desc);


-- =============================================================================
-- LOGGING HELPER
-- Resolves the current authenticated user's display name (if any) and
-- inserts a row. Called by every trigger below.
-- =============================================================================

create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_name text;
begin

  v_actor_id := auth.uid();

  if v_actor_id is not null then
    select full_name into v_actor_name
    from public.profiles
    where id = v_actor_id;
  end if;

  insert into public.activity_log (
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_label
  )
  values (
    v_actor_id,
    coalesce(v_actor_name, 'BANHA Device (Node 2)'),
    p_action,
    p_entity_type,
    p_entity_label
  );

end;
$$;


-- =============================================================================
-- RECORDINGS ACTIVITY
-- =============================================================================

create or replace function public.log_recording_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin

  select coalesce(d.device_name, 'Unknown device')
  into v_label
  from public.devices d
  where d.id = coalesce(new.device_id, old.device_id);

  v_label := coalesce(v_label, 'Unknown device');

  if tg_op = 'INSERT' then

    perform public.log_activity('recording_started', 'recording', v_label);

  elsif tg_op = 'UPDATE' then

    if old.status = 'recording' and new.status in ('pending_assessment', 'completed') then
      perform public.log_activity('recording_stopped', 'recording', v_label);
    end if;

    if old.is_archived = false and new.is_archived = true then
      perform public.log_activity('recording_archived', 'recording', v_label);
    elsif old.is_archived = true and new.is_archived = false then
      perform public.log_activity('recording_restored', 'recording', v_label);
    end if;

  elsif tg_op = 'DELETE' then

    perform public.log_activity('recording_deleted', 'recording', v_label);

  end if;

  return coalesce(new, old);

end;
$$;


drop trigger if exists trg_log_recording_insert on public.recordings;
create trigger trg_log_recording_insert
after insert on public.recordings
for each row execute function public.log_recording_activity();

drop trigger if exists trg_log_recording_update on public.recordings;
create trigger trg_log_recording_update
after update on public.recordings
for each row execute function public.log_recording_activity();

drop trigger if exists trg_log_recording_delete on public.recordings;
create trigger trg_log_recording_delete
after delete on public.recordings
for each row execute function public.log_recording_activity();


-- =============================================================================
-- ASSESSMENTS ACTIVITY
-- =============================================================================

create or replace function public.log_assessment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin

  v_label :=
    coalesce(new.subject, old.subject)
    || ' — '
    || coalesce(new.assessment_type, old.assessment_type)
    || ' #'
    || coalesce(new.assessment_number, old.assessment_number)::text;

  if tg_op = 'INSERT' then

    perform public.log_activity('assessment_added', 'assessment', v_label);

  elsif tg_op = 'UPDATE' then

    if old.is_archived = false and new.is_archived = true then
      perform public.log_activity('assessment_archived', 'assessment', v_label);
    elsif old.is_archived = true and new.is_archived = false then
      perform public.log_activity('assessment_restored', 'assessment', v_label);
    else
      perform public.log_activity('assessment_updated', 'assessment', v_label);
    end if;

  elsif tg_op = 'DELETE' then

    perform public.log_activity('assessment_deleted', 'assessment', v_label);

  end if;

  return coalesce(new, old);

end;
$$;


drop trigger if exists trg_log_assessment_insert on public.assessments;
create trigger trg_log_assessment_insert
after insert on public.assessments
for each row execute function public.log_assessment_activity();

drop trigger if exists trg_log_assessment_update on public.assessments;
create trigger trg_log_assessment_update
after update on public.assessments
for each row execute function public.log_assessment_activity();

drop trigger if exists trg_log_assessment_delete on public.assessments;
create trigger trg_log_assessment_delete
after delete on public.assessments
for each row execute function public.log_assessment_activity();


-- =============================================================================
-- SETTINGS OPTIONS ACTIVITY
-- =============================================================================

create or replace function public.log_settings_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin

  v_label := coalesce(new.value, old.value) || ' (' || coalesce(new.category, old.category) || ')';

  if tg_op = 'INSERT' then

    perform public.log_activity('setting_added', 'setting', v_label);

  elsif tg_op = 'UPDATE' then

    if old.is_archived = false and new.is_archived = true then
      perform public.log_activity('setting_archived', 'setting', v_label);
    elsif old.is_archived = true and new.is_archived = false then
      perform public.log_activity('setting_restored', 'setting', v_label);
    elsif old.value is distinct from new.value then
      perform public.log_activity(
        'setting_renamed',
        'setting',
        old.value || ' → ' || new.value || ' (' || new.category || ')'
      );
    end if;

  end if;

  return new;

end;
$$;


drop trigger if exists trg_log_settings_insert on public.settings_options;
create trigger trg_log_settings_insert
after insert on public.settings_options
for each row execute function public.log_settings_activity();

drop trigger if exists trg_log_settings_update on public.settings_options;
create trigger trg_log_settings_update
after update on public.settings_options
for each row execute function public.log_settings_activity();


-- =============================================================================
-- PROFILE RENAME ACTIVITY
-- =============================================================================

create or replace function public.log_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if old.full_name is distinct from new.full_name then
    perform public.log_activity(
      'profile_renamed',
      'profile',
      old.full_name || ' → ' || new.full_name
    );
  end if;

  return new;

end;
$$;


drop trigger if exists trg_log_profile_update on public.profiles;
create trigger trg_log_profile_update
after update on public.profiles
for each row execute function public.log_profile_activity();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.activity_log enable row level security;

drop policy if exists "Authenticated users can view activity log" on public.activity_log;
create policy "Authenticated users can view activity log"
on public.activity_log
for select
to authenticated
using (true);


-- =============================================================================
-- REALTIME
-- So the Dashboard's Activity Log widget updates live.
-- =============================================================================

do $$
begin

  begin
    alter publication supabase_realtime
    add table public.activity_log;
  exception
    when duplicate_object then
      null;
  end;

end;
$$;
