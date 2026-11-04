-- =============================================================================
-- BANHA — Assessment workflow update (additive & backward compatible)
-- =============================================================================
-- Run AFTER 06_feature_update.sql. Safe to re-run.
--
-- Adds to `assessments`:
--   duration_type          'one_day' | 'continuous'
--   is_finalized           assessment activity marked completed (final results in)
--   show_in_assessments    published on the Assessments page (true/false)
--
-- Nothing is deleted. Existing rows only receive values in the NEW columns
-- (triggers are paused during that backfill so no status changes or activity-
-- log entries are produced and no existing timestamp is touched).
-- =============================================================================

-- 1. New columns -------------------------------------------------------------
-- show_in_assessments defaults to TRUE so every assessment that already exists
-- keeps appearing on the Assessments page. The app always sends an explicit
-- value for new assessments (default "No").
alter table public.assessments
  add column if not exists duration_type text,
  add column if not exists is_finalized boolean not null default false,
  add column if not exists show_in_assessments boolean not null default true;

alter table public.assessments drop constraint if exists assessments_duration_type_check;
alter table public.assessments
  add constraint assessments_duration_type_check
  check (duration_type is null or duration_type in ('one_day', 'continuous'));

-- 2. Backfill the new columns only -------------------------------------------
alter table public.assessments disable trigger user;

update public.assessments
set duration_type = case when group_id is not null then 'continuous' else 'one_day' end
where duration_type is null;

update public.assessments
set is_finalized = true
where is_finalized = false
  and (class_average_score is not null or score_percentage is not null);

alter table public.assessments enable trigger user;

-- 3. "At least one field" rule now also counts the new/optional fields -------
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
    or score_percentage is not null
    or classroom_type is not null
    or class_schedule is not null
    or duration_type is not null
  );

-- 4. Details completeness = the shared initial details ----------------------
-- Class average / score percentage are final results entered later, so they
-- are no longer needed for "Completed". (Existing recording statuses are not
-- recomputed here; they refresh the next time their assessment changes.)
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
     and a.classroom_type is not null
     and a.class_schedule is not null
     and a.duration_type is not null;
$$;

-- 5. Grouping keeps the shared details instead of forcing a reset -----------
-- * Existing group assessment wins; otherwise the earliest selected recording's
--   assessment becomes the group's (shared details carried over, scores kept).
-- * Blank shared fields on the kept assessment are filled from the others.
-- * Any other individual assessment is ARCHIVED (not deleted) so nothing is lost.
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
  v_target_id uuid;
  v_src record;
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

    begin
      insert into public.recording_groups (name) values (v_name) returning id into v_group_id;
    exception when unique_violation then
      raise exception 'A group named "%" already exists.', v_name;
    end;
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
  end if;

  -- Which assessment does the group keep?
  select id into v_target_id
  from public.assessments
  where group_id = v_group_id and is_archived = false
  limit 1;

  if v_target_id is null then
    select a.id into v_target_id
    from public.assessments a
    join public.recordings r on r.id = a.recording_id
    where a.recording_id = any(p_recording_ids) and a.is_archived = false
    order by r.started_at asc
    limit 1;

    if v_target_id is not null then
      update public.assessments
      set group_id = v_group_id, recording_id = null
      where id = v_target_id;
    end if;
  end if;

  if v_target_id is not null then
    for v_src in
      select a.*
      from public.assessments a
      where a.recording_id = any(p_recording_ids)
        and a.is_archived = false
        and a.id <> v_target_id
    loop
      update public.assessments t
      set subject           = coalesce(t.subject, v_src.subject),
          section           = coalesce(t.section, v_src.section),
          group_type        = coalesce(t.group_type, v_src.group_type),
          assessment_type   = coalesce(t.assessment_type, v_src.assessment_type),
          assessment_number = coalesce(t.assessment_number, v_src.assessment_number),
          classroom_type    = coalesce(t.classroom_type, v_src.classroom_type),
          class_schedule    = coalesce(t.class_schedule, v_src.class_schedule)
      where t.id = v_target_id;

      update public.assessments
      set is_archived = true, archived_at = now()
      where id = v_src.id;
    end loop;

    -- Several recordings share it, so it is a continuous assessment.
    update public.assessments
    set duration_type = 'continuous'
    where id = v_target_id and duration_type is distinct from 'continuous';
  end if;

  update public.recordings
  set group_id = v_group_id
  where id = any(p_recording_ids)
    and group_id is distinct from v_group_id;

  perform public.refresh_group_assessment_date(v_group_id);

  return v_group_id;
end;
$$;

grant execute on function public.group_recordings(uuid[], uuid, text) to authenticated;
