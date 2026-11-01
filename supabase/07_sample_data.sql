-- =============================================================================
-- BANHA — Sample Data (for demos / testing only)
-- Run AFTER 01, 02, 03, 06, 08 and 09. Safe to re-run: it removes its own previous
-- sample rows first (fixed IDs) and never touches your real data.
-- Not included: `profiles` (rows are created automatically when a user signs up).
-- To remove it later: run the DELETE block at the top of this file.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Clean previous sample rows
-- ---------------------------------------------------------------------------
delete from public.assessments
where recording_id::text like '11111111-0000-0000-0000-0000000000%'
   or group_id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.recordings where id::text like '11111111-0000-0000-0000-0000000000%';
delete from public.recording_groups where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.activity_log where actor_name = 'Sample Data';

-- Load with triggers off so statuses, durations and activity timestamps are
-- exactly as written below (consistent with what the triggers would produce).
alter table public.recordings disable trigger user;
alter table public.assessments disable trigger user;
alter table public.recording_groups disable trigger user;
alter table public.settings_options disable trigger user;
alter table public.environmental_readings disable trigger user;

-- ---------------------------------------------------------------------------
-- SETTINGS OPTIONS
-- ---------------------------------------------------------------------------
insert into public.settings_options (category, value) values
  ('subject', 'Information Management'),
  ('subject', 'System Integration and Architecture'),
  ('section', 'A'),
  ('section', 'B'),
  ('section', 'C'),
  ('assessment_type', 'Quiz'),
  ('assessment_type', 'Examination'),
  ('assessment_type', 'Activity'),
  ('assessment_type', 'Exercise'),
  ('classroom_type', 'Room 101'),
  ('classroom_type', 'Room 202'),
  ('classroom_type', 'Computer Laboratory'),
  ('classroom_type', 'Science Laboratory'),
  ('classroom_type', 'Lecture Hall'),
  ('class_schedule', 'Mon/Wed 7:30–9:00 AM'),
  ('class_schedule', 'Tue/Thu 9:00–10:30 AM'),
  ('class_schedule', 'Mon/Wed 1:00–2:30 PM'),
  ('class_schedule', 'Fri 3:00–4:30 PM')
on conflict (category, value) do nothing;

-- One archived option to demo Restore / Permanently Delete
insert into public.settings_options (category, value, is_archived, archived_at)
values ('classroom_type', 'Room 303 (Under Renovation)', true, now())
on conflict (category, value) do nothing;

-- ---------------------------------------------------------------------------
-- RECORDING GROUP (one assessment spanning two days)
-- ---------------------------------------------------------------------------
insert into public.recording_groups (id, name, created_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Info Mgmt Quiz 1 – Sec A', '2026-10-07 10:00+08');

-- ---------------------------------------------------------------------------
-- RECORDINGS (+ generated 1-minute sensor packets)
-- n, start (PH time), minutes, base temp, base noise, status, group, note
-- ---------------------------------------------------------------------------
create temp table _rec (
  n int primary key, started timestamptz, minutes int, base_t numeric, base_n numeric,
  status text, grp uuid, note text, archived boolean, archived_with boolean
) on commit drop;

insert into _rec values
 ( 1, '2026-10-05 07:30+08', 80, 27.8, 58, 'completed',             'aaaaaaaa-0000-0000-0000-000000000001', 'Quiz 1 day 1 – continued Wednesday. Windows closed, AC off.', false, false),
 ( 2, '2026-10-07 07:30+08', 80, 28.4, 61, 'completed',             'aaaaaaaa-0000-0000-0000-000000000001', 'Quiz 1 day 2 – remaining students.', false, false),
 ( 3, '2026-10-06 09:00+08', 90, 29.6, 67, 'completed',             null, 'Midterm exam. Construction noise outside.', false, false),
 ( 4, '2026-10-09 15:00+08', 60, 30.4, 52, 'completed',             null, null, false, false),
 ( 5, '2026-10-13 09:00+08', 75, 29.1, 63, 'completed',             null, null, false, false),
 ( 6, '2026-10-14 13:00+08', 60, 26.2, 54, 'incomplete_assessment', null, 'Only subject and room noted so far.', false, false),
 ( 7, '2026-10-19 07:30+08', 70, 25.4, 49, 'pending_assessment',    null, 'Need to confirm section and quiz number with the instructor.', false, false),
 ( 8, '2026-10-21 13:00+08', 60, 27.0, 57, 'pending_assessment',    null, null, false, false),
 ( 9, '2026-09-28 07:30+08', 70, 25.9, 50, 'completed',             null, 'Archived: duplicate of a rescheduled session.', true,  false),
 (10, '2026-09-30 13:00+08', 60, 31.0, 70, 'pending_assessment',    null, null, true,  true),
 (11, '2026-10-20 09:00+08', 70, 26.4, 56, 'completed',             null, null, false, false),
 (12, '2026-10-27 07:30+08', 70, 25.8, 50, 'completed',             null, null, false, false),
 (13, '2026-10-23 15:00+08', 60, 29.8, 60, 'completed',             null, null, false, false);

insert into public.recordings
  (id, started_at, ended_at, duration_seconds, status, is_archived, archived_at, archived_with_assessment, group_id, notes, created_at)
select ('11111111-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       started, started + make_interval(mins => minutes), minutes * 60, status,
       archived, case when archived then started + make_interval(days => 3) end,
       archived_with, grp, note, started
from _rec;

insert into public.environmental_readings
  (recording_id, packet_number, average_temperature, average_noise, recorded_at)
select ('11111111-0000-0000-0000-0000000000' || lpad(r.n::text, 2, '0'))::uuid,
       g.i,
       round((r.base_t + 0.9 * sin(g.i / 9.0 + r.n) + 0.012 * g.i)::numeric, 2),
       round((r.base_n + 5 * sin(g.i / 4.0 + r.n) + (g.i % 7) * 0.8)::numeric, 2),
       r.started + make_interval(mins => g.i)
from _rec r
cross join lateral generate_series(1, r.minutes) as g(i);

-- ---------------------------------------------------------------------------
-- ASSESSMENTS
-- Group assessment owns recordings 1 & 2; the rest belong to one recording.
-- ---------------------------------------------------------------------------
create temp table _asm (
  n int, subject text, section text, grp_type text, a_type text, a_no int,
  avg_score numeric, total numeric, classroom text, schedule text, archived boolean
) on commit drop;

insert into _asm values
 ( 3, 'Information Management',              'B', 'Comparison',   'Examination', 1, 41.2, 60, 'Room 202',            'Tue/Thu 9:00–10:30 AM', false),
 ( 4, 'System Integration and Architecture', 'A', 'Experimental', 'Quiz',        1, 12.6, 15, 'Computer Laboratory', 'Fri 3:00–4:30 PM',      false),
 ( 5, 'System Integration and Architecture', 'B', 'Comparison',   'Quiz',        1,  9.8, 15, 'Room 202',            'Tue/Thu 9:00–10:30 AM', false),
 ( 6, 'Information Management',              null, null,          null,       null, null, null, 'Room 101',          null,                    false),
 ( 9, 'Information Management',              'A', 'Experimental', 'Activity',    1, 17.1, 20, 'Room 101',            'Mon/Wed 7:30–9:00 AM',  false),
 (10, 'System Integration and Architecture', 'B', 'Comparison',   'Activity',    1, 11.4, 20, 'Computer Laboratory', 'Mon/Wed 1:00–2:30 PM',  true),
 (11, 'Information Management',              'B', 'Comparison',   'Quiz',        2, 10.9, 15, 'Room 101',            'Tue/Thu 9:00–10:30 AM', false),
 (12, 'System Integration and Architecture', 'A', 'Experimental', 'Quiz',        2, 13.4, 15, 'Room 101',            'Mon/Wed 7:30–9:00 AM',  false),
 (13, 'Information Management',              'A', 'Experimental', 'Activity',    2, 14.2, 20, 'Computer Laboratory', 'Fri 3:00–4:30 PM',      false);

insert into public.assessments
  (recording_id, subject, section, group_type, assessment_type, assessment_number, assessment_date,
   class_average_score, total_possible_score, score_percentage, classroom_type, class_schedule,
   is_archived, archived_at)
select r.id, a.subject, a.section, a.grp_type, a.a_type, a.a_no,
       (r.ended_at at time zone 'UTC')::date,
       a.avg_score, a.total,
       case when a.avg_score is not null and a.total > 0 then round(a.avg_score / a.total * 100, 2) end,
       a.classroom, a.schedule, a.archived,
       case when a.archived then r.started_at + make_interval(days => 3) end
from _asm a
join public.recordings r
  on r.id = ('11111111-0000-0000-0000-0000000000' || lpad(a.n::text, 2, '0'))::uuid;

-- Group-level assessment (Quiz 1, Sec A) shared by recordings 1 and 2
insert into public.assessments
  (group_id, subject, section, group_type, assessment_type, assessment_number, assessment_date,
   class_average_score, total_possible_score, score_percentage, classroom_type, class_schedule)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Information Management', 'A', 'Experimental', 'Quiz', 1,
   (select (min(ended_at) at time zone 'UTC')::date from public.recordings
    where group_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
   13.8, 15, 92.00, 'Room 101', 'Mon/Wed 7:30–9:00 AM');

-- Columns added by 08_assessment_workflow_update.sql (skipped if 08 is not applied yet)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'assessments' and column_name = 'duration_type') then
    update public.assessments
    set duration_type = case when group_id is not null then 'continuous' else 'one_day' end,
        is_finalized = (class_average_score is not null),
        show_in_assessments = (class_average_score is not null)
    where group_id = 'aaaaaaaa-0000-0000-0000-000000000001'
       or recording_id::text like '11111111-0000-0000-0000-0000000000%';
  end if;
end $$;

-- Classroom / schedule are stored per recording (added by 09_grouping_rules_update.sql)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'recordings' and column_name = 'classroom_type') then
    update public.recordings r
    set classroom_type = a.classroom_type, class_schedule = a.class_schedule
    from public.assessments a
    where r.id::text like '11111111-0000-0000-0000-0000000000%'
      and (a.recording_id = r.id or (a.group_id is not null and a.group_id = r.group_id));

    -- Session 2 of the grouped assessment took place in a different room / schedule
    update public.recordings
    set classroom_type = 'Computer Laboratory', class_schedule = 'Mon/Wed 1:00–2:30 PM'
    where id = '11111111-0000-0000-0000-000000000002';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- ACTIVITY LOG (backdated, newest first on the Dashboard)
-- ---------------------------------------------------------------------------
insert into public.activity_log (actor_name, action, entity_type, entity_label, created_at)
select 'Sample Data', 'recording_started', 'recording', 'Recording ' || left(id::text, 8), started_at
from public.recordings where id::text like '11111111-0000-0000-0000-0000000000%'
union all
select 'Sample Data', 'recording_stopped', 'recording', 'Recording ' || left(id::text, 8), ended_at
from public.recordings where id::text like '11111111-0000-0000-0000-0000000000%'
union all
select 'Sample Data', 'assessment_added', 'assessment',
       concat_ws(' — ', a.subject, nullif(concat_ws(' #', a.assessment_type, a.assessment_number::text), '')),
       coalesce(r.ended_at, g.created_at) + interval '20 minutes'
from public.assessments a
left join public.recordings r on r.id = a.recording_id
left join public.recording_groups g on g.id = a.group_id
where r.id::text like '11111111-0000-0000-0000-0000000000%' or a.group_id = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'Sample Data', 'recording_grouped', 'recording',
       'Recording ' || left(id::text, 8) || ' → Info Mgmt Quiz 1 – Sec A', '2026-10-07 10:00+08'
from public.recordings where group_id = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'Sample Data', 'recording_archived', 'recording', 'Recording ' || left(id::text, 8), archived_at
from public.recordings where id::text like '11111111-0000-0000-0000-0000000000%' and is_archived
union all
select 'Sample Data', 'setting_added', 'setting', 'Room 202 (classroom_type)', '2026-09-25 09:00+08';

-- ---------------------------------------------------------------------------
alter table public.recordings enable trigger user;
alter table public.assessments enable trigger user;
alter table public.recording_groups enable trigger user;
alter table public.settings_options enable trigger user;
alter table public.environmental_readings enable trigger user;

commit;
