-- =============================================================================
-- BANHA — Grouping rules update (additive & backward compatible)
-- =============================================================================
-- Run AFTER 06 and 08. Safe to re-run.
--
-- * Classroom / Class Schedule now belong to each RECORDING (sessions of one
--   assessment can happen in different rooms / schedules). New columns are
--   added to `recordings` and filled from the assessment each recording
--   already belongs to. Old assessment columns are left untouched.
-- * Recordings can only be grouped when Subject, Section, Group, Assessment
--   Type and Assessment Number all match.
-- * "Completed" now means: all of those details + final results (class
--   average and score percentage) + the assessment marked completed, and every
--   recording of it has its classroom and schedule.
-- * `assessments.duration_type` (from 08) is no longer used by the app. The
--   column is kept so no data is lost.
-- =============================================================================

-- 1. Per-recording session details (new columns only) -----------------------
alter table public.recordings
  add column if not exists classroom_type text,
  add column if not exists class_schedule text;

alter table public.recordings disable trigger user;

update public.recordings r
set classroom_type = coalesce(r.classroom_type, a.classroom_type),
    class_schedule = coalesce(r.class_schedule, a.class_schedule)
from public.assessments a
where a.is_archived = false
  and (a.recording_id = r.id or (a.group_id is not null and a.group_id = r.group_id))
  and (r.classroom_type is null or r.class_schedule is null)
  and (a.classroom_type is not null or a.class_schedule is not null);

alter table public.recordings enable trigger user;


-- 2. Identity of an assessment (what must match to group recordings) --------
create or replace function public.assessment_identity_key(a public.assessments)
returns text
language sql
immutable
as $$
  select case
    when a.subject is null or a.section is null or a.group_type is null
      or a.assessment_type is null or a.assessment_number is null
    then null
    else lower(trim(a.subject)) || '|' || lower(trim(a.section)) || '|' || a.group_type
         || '|' || lower(trim(a.assessment_type)) || '|' || a.assessment_number::text
  end;
$$;


-- 3. Completeness = identity + final results + marked completed -------------
create or replace function public.assessment_is_complete(a public.assessments)
returns boolean
language sql
immutable
as $$
  select public.assessment_identity_key(a) is not null
     and a.class_average_score is not null
     and a.score_percentage is not null
     and a.is_finalized;
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
  elsif public.assessment_is_complete(v_a)
    and not exists (
      select 1 from public.recordings m
      where m.is_archived = false
        and m.status <> 'recording'
        and (m.classroom_type is null or m.class_schedule is null)
        and (m.id = v_rec.id or (v_rec.group_id is not null and m.group_id = v_rec.group_id))
    )
  then
    v_new := 'completed';
  else
    v_new := 'incomplete_assessment';
  end if;

  if v_new is distinct from v_rec.status then
    update public.recordings set status = v_new where id = v_rec.id;
  end if;
end;
$$;


create or replace function public.sync_recording_status_on_session_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_for_assessment(new.id, new.group_id);
  return new;
end;
$$;

drop trigger if exists on_recording_session_changed on public.recordings;
create trigger on_recording_session_changed
after update of classroom_type, class_schedule on public.recordings
for each row
when (old.classroom_type is distinct from new.classroom_type
      or old.class_schedule is distinct from new.class_schedule)
execute function public.sync_recording_status_on_session_change();


-- 4. Grouping with strict matching ------------------------------------------
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
  v_new_ids uuid[];
  v_bad uuid;
  v_key text;
  v_key_count int;
  v_group_key text;
  v_group_final boolean;
  v_group_label text;
  v_dup_name text;
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
    if exists (select 1 from public.recordings where id = any(p_recording_ids) and group_id is not null) then
      raise exception 'One or more selected recordings already belong to an assessment group.';
    end if;
  else
    if not exists (select 1 from public.recording_groups where id = v_group_id) then
      raise exception 'The selected group no longer exists.';
    end if;

    if exists (
      select 1 from public.recordings
      where id = any(p_recording_ids) and group_id is not null and group_id <> v_group_id
    ) then
      raise exception 'One or more selected recordings already belong to a different assessment group.';
    end if;
  end if;

  -- Recordings that really need to be added (already-members are skipped).
  v_new_ids := array(
    select id from public.recordings
    where id = any(p_recording_ids)
      and (v_group_id is null or group_id is distinct from v_group_id)
  );

  if coalesce(array_length(v_new_ids, 1), 0) = 0 then
    return v_group_id;
  end if;

  -- Every recording needs its identifying details so matches can be verified.
  select r.id into v_bad
  from public.recordings r
  left join public.assessments a on a.recording_id = r.id and a.is_archived = false
  where r.id = any(v_new_ids)
    and (a.id is null or public.assessment_identity_key(a) is null)
  limit 1;

  if v_bad is not null then
    raise exception 'Recording % needs Subject, Section, Group, Assessment Type and Assessment Number before it can be grouped.', left(v_bad::text, 8);
  end if;

  select count(distinct public.assessment_identity_key(a)), min(public.assessment_identity_key(a))
  into v_key_count, v_key
  from public.assessments a
  where a.recording_id = any(v_new_ids) and a.is_archived = false;

  if v_key_count > 1 then
    raise exception 'These recordings are not the same assessment. Subject, Section, Group, Assessment Type and Assessment Number must all match.';
  end if;

  if v_group_id is not null then
    select public.assessment_identity_key(a), a.is_finalized, rg.name
    into v_group_key, v_group_final, v_group_label
    from public.recording_groups rg
    left join public.assessments a on a.group_id = rg.id and a.is_archived = false
    where rg.id = v_group_id;

    if v_group_key is not null and v_group_key <> v_key then
      raise exception 'These recordings do not match assessment group "%". Subject, Section, Group, Assessment Type and Assessment Number must all match.', v_group_label;
    end if;

    if coalesce(v_group_final, false) then
      raise exception 'Assessment group "%" is marked Completed. Set it back to Ongoing before adding recordings.', v_group_label;
    end if;
  else
    select rg.name into v_dup_name
    from public.recording_groups rg
    join public.assessments a on a.group_id = rg.id and a.is_archived = false
    where public.assessment_identity_key(a) = v_key
    limit 1;

    if v_dup_name is not null then
      raise exception 'An assessment group for this assessment already exists: "%". Add the recordings to it instead.', v_dup_name;
    end if;

    if v_name is null then
      select concat_ws(' · ', a.subject, a.section, a.group_type, a.assessment_type || ' ' || a.assessment_number::text)
      into v_name
      from public.assessments a
      where a.recording_id = any(v_new_ids) and a.is_archived = false
      limit 1;
    end if;

    begin
      insert into public.recording_groups (name) values (v_name) returning id into v_group_id;
    exception when unique_violation then
      raise exception 'A group named "%" already exists.', v_name;
    end;
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
    where a.recording_id = any(v_new_ids) and a.is_archived = false
    order by r.started_at asc
    limit 1;

    if v_target_id is not null then
      update public.assessments
      set group_id = v_group_id, recording_id = null
      where id = v_target_id;
    end if;
  end if;

  -- Other individual copies are archived (never deleted).
  if v_target_id is not null then
    for v_src in
      select a.id
      from public.assessments a
      where a.recording_id = any(v_new_ids)
        and a.is_archived = false
        and a.id <> v_target_id
    loop
      update public.assessments
      set is_archived = true, archived_at = now()
      where id = v_src.id;
    end loop;
  end if;

  update public.recordings
  set group_id = v_group_id
  where id = any(v_new_ids);

  perform public.refresh_group_assessment_date(v_group_id);

  return v_group_id;
end;
$$;

grant execute on function public.group_recordings(uuid[], uuid, text) to authenticated;
