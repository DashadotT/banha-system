-- =============================================================================
-- BANHA — Feature update: recording groups, notes, partial assessment details,
-- classroom / schedule fields, consistent archiving.
-- =============================================================================
-- Run AFTER 01_schema.sql and 02_activity_log.sql (safe on existing data and
-- safe to re-run). Supersedes 05_sync_recording_status.sql — do not run 05
-- after this file.
-- =============================================================================


-- =============================================================================
-- RECORDING GROUPS (one assessment spanning several recordings / days)
-- =============================================================================

create table if not exists public.recording_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_recording_groups_name
on public.recording_groups (lower(trim(name)));

alter table public.recording_groups enable row level security;

drop policy if exists "Authenticated users can manage recording groups" on public.recording_groups;
create policy "Authenticated users can manage recording groups"
on public.recording_groups
for all to authenticated
using (true) with check (true);


-- =============================================================================
-- RECORDINGS: group, notes, archive bookkeeping, new status
-- =============================================================================

alter table public.recordings
  add column if not exists group_id uuid references public.recording_groups(id) on delete set null,
  add column if not exists notes text,
  add column if not exists archived_with_assessment boolean not null default false;

create index if not exists idx_recordings_group on public.recordings(group_id);

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.recordings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%pending_assessment%'
  loop
    execute format('alter table public.recordings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.recordings
  add constraint recordings_status_check
  check (status in ('recording', 'pending_assessment', 'incomplete_assessment', 'completed'));


-- =============================================================================
-- ASSESSMENTS: partial details, classroom / schedule, group ownership
-- =============================================================================

alter table public.assessments alter column recording_id drop not null;
alter table public.assessments alter column subject drop not null;
alter table public.assessments alter column section drop not null;
alter table public.assessments alter column group_type drop not null;
alter table public.assessments alter column assessment_type drop not null;
alter table public.assessments alter column assessment_number drop not null;
alter table public.assessments alter column class_average_score drop not null;
alter table public.assessments alter column total_possible_score drop not null;
alter table public.assessments alter column score_percentage drop not null;

alter table public.assessments
  add column if not exists classroom_type text,
  add column if not exists class_schedule text,
  add column if not exists group_id uuid references public.recording_groups(id) on delete cascade;

create index if not exists idx_assessments_group on public.assessments(group_id);

alter table public.assessments drop constraint if exists assessments_single_owner_check;
alter table public.assessments
  add constraint assessments_single_owner_check
  check (
    (recording_id is not null and group_id is null)
    or (recording_id is null and group_id is not null)
  );

alter table public.assessments drop constraint if exists assessments_has_details_check;
alter table public.assessments
  add constraint assessments_has_details_check
  check (
    subject is not null
    or section is not null
    or group_type is not null
    or assessment_type is not null
    or assessment_number is not null
    or class_average_score is not null
    or total_possible_score is not null
    or classroom_type is not null
    or class_schedule is not null
  );

do $$
begin
  begin
    create unique index if not exists uq_assessments_active_recording
    on public.assessments(recording_id)
    where recording_id is not null and is_archived = false;
  exception when others then
    raise notice 'Skipped uq_assessments_active_recording (existing duplicate active assessments): %', sqlerrm;
  end;
  begin
    create unique index if not exists uq_assessments_active_group
    on public.assessments(group_id)
    where group_id is not null and is_archived = false;
  exception when others then
    raise notice 'Skipped uq_assessments_active_group: %', sqlerrm;
  end;
end $$;


-- =============================================================================
-- SETTINGS OPTIONS: Class Schedule + Classroom / Room Type categories
-- =============================================================================

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.settings_options'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%assessment_type%'
  loop
    execute format('alter table public.settings_options drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.settings_options
  add constraint settings_options_category_check
  check (category in ('subject', 'section', 'assessment_type', 'classroom_type', 'class_schedule'));


-- =============================================================================
-- STATUS SYNC
-- A recording's status is derived from its effective (non-archived)
-- assessment — either its own, or its group's:
--   none -> pending_assessment | partial -> incomplete_assessment | full -> completed
-- =============================================================================

create or replace function public.assessment_is_complete(a public.assessments)
returns boolean
language sql
immutable
as $$
  select a.subject is not null
     and a.section is not null
     and a.group_type is not null
     and a.assessment_type is not null
     and a.assessment_number is not null
     and a.class_average_score is not null
     and a.total_possible_score is not null
     and a.classroom_type is not null
     and a.class_schedule is not null;
$$;


create or replace function public.recompute_recording_status(p_recording_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.recordings%rowtype;
  v_a public.assessments%rowtype;
  v_new text;
begin
  select * into v_rec from public.recordings where id = p_recording_id;

  if not found or v_rec.status = 'recording' then
    return;
  end if;

  select a.* into v_a
  from public.assessments a
  where a.is_archived = false
    and (
      a.recording_id = v_rec.id
      or (v_rec.group_id is not null and a.group_id = v_rec.group_id)
    )
  order by a.created_at desc
  limit 1;

  if not found then
    v_new := 'pending_assessment';
  elsif public.assessment_is_complete(v_a) then
    v_new := 'completed';
  else
    v_new := 'incomplete_assessment';
  end if;

  if v_new is distinct from v_rec.status then
    update public.recordings set status = v_new where id = v_rec.id;
  end if;
end;
$$;


create or replace function public.recompute_for_assessment(p_recording_id uuid, p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select id from public.recordings
    where (p_recording_id is not null and id = p_recording_id)
       or (p_group_id is not null and group_id = p_group_id)
  loop
    perform public.recompute_recording_status(r.id);
  end loop;
end;
$$;


create or replace function public.sync_recording_status_from_assessment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recompute_for_assessment(old.recording_id, old.group_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recompute_for_assessment(new.recording_id, new.group_id);
  end if;

  return coalesce(new, old);
end;
$$;


drop trigger if exists on_assessment_created on public.assessments;
drop trigger if exists on_assessment_updated on public.assessments;
drop trigger if exists on_assessment_deleted on public.assessments;

create trigger on_assessment_created
after insert on public.assessments
for each row execute function public.sync_recording_status_from_assessment();

create trigger on_assessment_updated
after update on public.assessments
for each row execute function public.sync_recording_status_from_assessment();

create trigger on_assessment_deleted
after delete on public.assessments
for each row execute function public.sync_recording_status_from_assessment();

drop function if exists public.mark_recording_assessed();


create or replace function public.sync_recording_status_on_group_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_recording_status(new.id);
  return new;
end;
$$;

drop trigger if exists on_recording_group_changed on public.recordings;
create trigger on_recording_group_changed
after update of group_id on public.recordings
for each row
when (old.group_id is distinct from new.group_id)
execute function public.sync_recording_status_on_group_change();


-- Remove a group automatically once its last recording is permanently deleted
-- (its group-level assessment goes with it via cascade).
create or replace function public.cleanup_empty_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.group_id is not null
     and not exists (select 1 from public.recordings where group_id = old.group_id)
  then
    delete from public.recording_groups where id = old.group_id;
  end if;
  return old;
end;
$$;

drop trigger if exists on_recording_deleted_cleanup_group on public.recordings;
create trigger on_recording_deleted_cleanup_group
after delete on public.recordings
for each row execute function public.cleanup_empty_group();


-- =============================================================================
-- RPC: GROUPING
-- =============================================================================

create or replace function public.refresh_group_assessment_date(p_group_id uuid)
returns void
language plpgsql
as $$
declare
  v_date date;
begin
  select ((min(coalesce(ended_at, started_at))) at time zone 'UTC')::date
  into v_date
  from public.recordings
  where group_id = p_group_id and is_archived = false;

  if v_date is null then
    select ((min(coalesce(ended_at, started_at))) at time zone 'UTC')::date
    into v_date
    from public.recordings
    where group_id = p_group_id;
  end if;

  if v_date is not null then
    update public.assessments
    set assessment_date = v_date
    where group_id = p_group_id
      and is_archived = false
      and assessment_date is distinct from v_date;
  end if;
end;
$$;


create or replace function public.group_recordings(
  p_recording_ids uuid[],
  p_group_id uuid default null,
  p_group_name text default null
)
returns uuid
language plpgsql
as $$
declare
  v_group_id uuid := p_group_id;
  v_name text := nullif(trim(coalesce(p_group_name, '')), '');
  v_ind_ids uuid[];
  v_group_has_assessment boolean := false;
begin
  if p_recording_ids is null or coalesce(array_length(p_recording_ids, 1), 0) = 0 then
    raise exception 'Select at least one recording to group.';
  end if;

  if exists (select 1 from public.recordings where id = any(p_recording_ids) and status = 'recording') then
    raise exception 'A recording that is still in progress cannot be grouped.';
  end if;

  if exists (select 1 from public.recordings where id = any(p_recording_ids) and is_archived = true) then
    raise exception 'Archived recordings cannot be grouped. Restore them first.';
  end if;

  if v_group_id is null then
    if v_name is null then
      raise exception 'Enter a name for the new group.';
    end if;

    if exists (select 1 from public.recordings where id = any(p_recording_ids) and group_id is not null) then
      raise exception 'One or more selected recordings already belong to a group. Add them to that group instead, or remove them from it first.';
    end if;
  else
    if not exists (select 1 from public.recording_groups where id = v_group_id) then
      raise exception 'The selected group no longer exists.';
    end if;

    if exists (
      select 1 from public.recordings
      where id = any(p_recording_ids) and group_id is not null and group_id <> v_group_id
    ) then
      raise exception 'One or more selected recordings already belong to a different group.';
    end if;

    select exists (
      select 1 from public.assessments where group_id = v_group_id and is_archived = false
    ) into v_group_has_assessment;
  end if;

  select coalesce(array_agg(a.id), '{}') into v_ind_ids
  from public.assessments a
  where a.recording_id = any(p_recording_ids) and a.is_archived = false;

  if coalesce(array_length(v_ind_ids, 1), 0) > 1 then
    raise exception 'More than one selected recording already has its own assessment details. Reset the extra details first so the group keeps a single set.';
  end if;

  if coalesce(array_length(v_ind_ids, 1), 0) = 1 and v_group_has_assessment then
    raise exception 'The target group already has assessment details. Reset the selected recording''s details first.';
  end if;

  if v_group_id is null then
    begin
      insert into public.recording_groups (name) values (v_name) returning id into v_group_id;
    exception when unique_violation then
      raise exception 'A group named "%" already exists.', v_name;
    end;
  end if;

  -- A single existing assessment moves up to the group; sensor data is untouched.
  if coalesce(array_length(v_ind_ids, 1), 0) = 1 then
    update public.assessments
    set group_id = v_group_id, recording_id = null
    where id = v_ind_ids[1];
  end if;

  update public.recordings
  set group_id = v_group_id
  where id = any(p_recording_ids)
    and group_id is distinct from v_group_id;

  perform public.refresh_group_assessment_date(v_group_id);

  return v_group_id;
end;
$$;


create or replace function public.ungroup_recording(p_recording_id uuid)
returns void
language plpgsql
as $$
declare
  v_group uuid;
  v_remaining int;
begin
  select group_id into v_group from public.recordings where id = p_recording_id;

  if v_group is null then
    return;
  end if;

  select count(*) into v_remaining
  from public.recordings
  where group_id = v_group and id <> p_recording_id;

  if v_remaining = 0 then
    -- Last member: the group dissolves and its assessment goes to this recording.
    update public.assessments
    set recording_id = p_recording_id, group_id = null
    where group_id = v_group;

    update public.recordings set group_id = null where id = p_recording_id;

    update public.assessments a
    set assessment_date = ((coalesce(r.ended_at, r.started_at)) at time zone 'UTC')::date
    from public.recordings r
    where r.id = p_recording_id
      and a.recording_id = p_recording_id
      and a.is_archived = false;

    delete from public.recording_groups where id = v_group;
  else
    update public.recordings set group_id = null where id = p_recording_id;
    perform public.refresh_group_assessment_date(v_group);
  end if;
end;
$$;


-- =============================================================================
-- RPC: ASSESSMENT RESET / ARCHIVE / RESTORE
-- =============================================================================

-- Clears assessment details (deletes only the assessment row). Recordings and
-- sensor readings are never touched; their status falls back to pending.
create or replace function public.reset_assessment_details(p_assessment_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('banha.assessment_reset', '1', true);
  delete from public.assessments where id = p_assessment_id;
  perform set_config('banha.assessment_reset', '', true);
end;
$$;


-- Archiving an assessment archives it together with its linked recording(s),
-- so the same unit disappears from Recordings and Assessments. Sensor data is
-- never deleted.
create or replace function public.archive_assessment(p_assessment_id uuid)
returns void
language plpgsql
as $$
declare
  v public.assessments%rowtype;
  v_now timestamptz := now();
begin
  select * into v from public.assessments where id = p_assessment_id;

  if not found then
    raise exception 'Assessment not found.';
  end if;

  if v.is_archived then
    return;
  end if;

  update public.assessments
  set is_archived = true, archived_at = v_now
  where id = p_assessment_id;

  update public.recordings
  set is_archived = true, archived_at = v_now, archived_with_assessment = true
  where is_archived = false
    and status <> 'recording'
    and (
      (v.recording_id is not null and id = v.recording_id)
      or (v.group_id is not null and group_id = v.group_id)
    );
end;
$$;


create or replace function public.restore_assessment(p_assessment_id uuid)
returns void
language plpgsql
as $$
declare
  v public.assessments%rowtype;
begin
  select * into v from public.assessments where id = p_assessment_id;

  if not found then
    raise exception 'Assessment not found.';
  end if;

  if not v.is_archived then
    return;
  end if;

  if exists (
    select 1 from public.assessments a
    where a.is_archived = false
      and a.id <> v.id
      and (
        (v.recording_id is not null and a.recording_id = v.recording_id)
        or (v.group_id is not null and a.group_id = v.group_id)
      )
  ) then
    raise exception 'Cannot restore: assessment details already exist for the same recording or group. Reset them first.';
  end if;

  if v.recording_id is not null and exists (
    select 1
    from public.recordings r
    join public.assessments a on a.group_id = r.group_id and a.is_archived = false
    where r.id = v.recording_id and r.group_id is not null
  ) then
    raise exception 'Cannot restore: this recording now belongs to a group that already has assessment details.';
  end if;

  update public.assessments
  set is_archived = false, archived_at = null
  where id = v.id;

  update public.recordings
  set is_archived = false, archived_at = null, archived_with_assessment = false
  where is_archived = true
    and archived_with_assessment = true
    and (
      (v.recording_id is not null and id = v.recording_id)
      or (v.group_id is not null and group_id = v.group_id)
    );
end;
$$;


grant execute on function public.group_recordings(uuid[], uuid, text) to authenticated;
grant execute on function public.ungroup_recording(uuid) to authenticated;
grant execute on function public.reset_assessment_details(uuid) to authenticated;
grant execute on function public.archive_assessment(uuid) to authenticated;
grant execute on function public.restore_assessment(uuid) to authenticated;


-- =============================================================================
-- ACTIVITY LOG UPDATES
-- =============================================================================

create or replace function public.log_recording_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  v_group_name text;
begin

  v_label := 'Recording ' || left(coalesce(new.id, old.id)::text, 8);

  if tg_op = 'INSERT' then

    perform public.log_activity('recording_started', 'recording', v_label);

  elsif tg_op = 'UPDATE' then

    if old.status = 'recording' and new.status in ('pending_assessment', 'incomplete_assessment', 'completed') then
      perform public.log_activity('recording_stopped', 'recording', v_label);
    end if;

    if old.is_archived = false and new.is_archived = true then
      perform public.log_activity('recording_archived', 'recording', v_label);
    elsif old.is_archived = true and new.is_archived = false then
      perform public.log_activity('recording_restored', 'recording', v_label);
    end if;

    if old.group_id is distinct from new.group_id then
      if new.group_id is not null then
        select name into v_group_name from public.recording_groups where id = new.group_id;
        perform public.log_activity('recording_grouped', 'recording', v_label || ' → ' || coalesce(v_group_name, 'group'));
      else
        select name into v_group_name from public.recording_groups where id = old.group_id;
        perform public.log_activity('recording_ungrouped', 'recording', v_label || coalesce(' ← ' || v_group_name, ''));
      end if;
    end if;

  elsif tg_op = 'DELETE' then

    perform public.log_activity('recording_deleted', 'recording', v_label);

  end if;

  return coalesce(new, old);

end;
$$;


create or replace function public.log_assessment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.assessments;
  v_label text;
begin

  if tg_op = 'DELETE' then
    v := old;
  else
    v := new;
  end if;

  v_label := coalesce(
    nullif(
      concat_ws(
        ' — ',
        v.subject,
        nullif(concat_ws(' #', v.assessment_type, v.assessment_number::text), '')
      ),
      ''
    ),
    'Assessment details'
  );

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

    if coalesce(current_setting('banha.assessment_reset', true), '') = '1' then
      perform public.log_activity('assessment_reset', 'assessment', v_label);
    else
      perform public.log_activity('assessment_deleted', 'assessment', v_label);
    end if;

  end if;

  return coalesce(new, old);

end;
$$;


create or replace function public.log_settings_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin

  if tg_op = 'DELETE' then

    perform public.log_activity(
      'setting_deleted',
      'setting',
      old.value || ' (' || old.category || ')'
    );
    return old;

  end if;

  v_label := new.value || ' (' || new.category || ')';

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

drop trigger if exists trg_log_settings_delete on public.settings_options;
create trigger trg_log_settings_delete
after delete on public.settings_options
for each row execute function public.log_settings_activity();


-- =============================================================================
-- REALTIME
-- =============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.recording_groups;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.assessments;
  exception when duplicate_object then null;
  end;
end;
$$;
