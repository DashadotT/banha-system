-- =============================================================================
-- BANHA — Sync recording status with assessment archive/delete state
-- =============================================================================
-- Run this ONLY on a database created before this fix. Fresh installs using
-- the current 01_schema.sql already have it and do not need to run this
-- file.
--
-- PROBLEM THIS FIXES:
-- Archiving (or permanently deleting) an assessment from the Assessments
-- page left the linked recording's status stuck on "Completed" in the
-- Recordings page, even though that recording no longer actually has a
-- live assessment attached — confusing, since the two pages appeared to
-- disagree about the same recording.
--
-- FIX: a recording's status now stays in sync automatically:
--   - assessment added                -> pending_assessment -> completed
--   - assessment archived              -> completed -> pending_assessment
--   - assessment restored              -> pending_assessment -> completed
--   - assessment permanently deleted   -> completed -> pending_assessment
-- =============================================================================

create or replace function public.mark_recording_assessed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if tg_op = 'INSERT' then

    update public.recordings
    set status = 'completed'
    where id = new.recording_id
      and status = 'pending_assessment';

  elsif tg_op = 'UPDATE' then

    if old.is_archived = false and new.is_archived = true then

      update public.recordings
      set status = 'pending_assessment'
      where id = new.recording_id
        and status = 'completed';

    elsif old.is_archived = true and new.is_archived = false then

      update public.recordings
      set status = 'completed'
      where id = new.recording_id
        and status = 'pending_assessment';

    end if;

  elsif tg_op = 'DELETE' then

    update public.recordings
    set status = 'pending_assessment'
    where id = old.recording_id
      and status = 'completed';

  end if;

  return coalesce(new, old);

end;
$$;


drop trigger if exists on_assessment_created on public.assessments;
drop trigger if exists on_assessment_updated on public.assessments;
drop trigger if exists on_assessment_deleted on public.assessments;


create trigger on_assessment_created
after insert on public.assessments
for each row
execute function public.mark_recording_assessed();

create trigger on_assessment_updated
after update on public.assessments
for each row
execute function public.mark_recording_assessed();

create trigger on_assessment_deleted
after delete on public.assessments
for each row
execute function public.mark_recording_assessed();


-- =============================================================================
-- BACKFILL
-- Apply the new rule retroactively to any recording whose assessment is
-- already archived but whose status wasn't updated at the time.
-- =============================================================================

update public.recordings r
set status = 'pending_assessment'
where r.status = 'completed'
  and not exists (
    select 1
    from public.assessments a
    where a.recording_id = r.id
      and a.is_archived = false
  )
  and exists (
    select 1
    from public.assessments a
    where a.recording_id = r.id
  );