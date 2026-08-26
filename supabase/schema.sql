-- =============================================================================
-- BANHA — Supabase database schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles
-- One row per authenticated user (mirrors auth.users). Created automatically
-- via the trigger below whenever a new Supabase Auth user signs up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'New User',
  email text not null,
  role text not null default 'researcher' check (role in ('administrator', 'researcher')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table if not exists public.devices (
  id uuid primary key default uuid_generate_v4(),
  device_name text not null,
  node_number integer not null default 1,
  status text not null default 'offline' check (status in ('online', 'offline', 'recording')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- recordings
-- ---------------------------------------------------------------------------
create table if not exists public.recordings (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid references public.devices (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  status text not null default 'recording'
    check (status in ('recording', 'completed', 'pending_assessment')),
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_recordings_active on public.recordings (is_archived, status);
create index if not exists idx_recordings_device on public.recordings (device_id);

-- ---------------------------------------------------------------------------
-- environmental_readings
-- One row per ~1-minute packet received from a BANHA device via Node 2.
-- ---------------------------------------------------------------------------
create table if not exists public.environmental_readings (
  id uuid primary key default uuid_generate_v4(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  packet_number integer not null,
  average_co2 numeric(8, 2) not null,
  average_temperature numeric(6, 2) not null,
  average_noise numeric(6, 2) not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_readings_recording on public.environmental_readings (recording_id, packet_number);

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------
create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  subject text not null,
  section text not null,
  group_type text not null check (group_type in ('Experimental', 'Comparison')),
  assessment_type text not null,
  assessment_number integer not null check (assessment_number >= 1),
  assessment_date date not null,
  class_average_score numeric(6, 2) not null,
  total_possible_score numeric(6, 2) not null,
  score_percentage numeric(5, 2) not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessments_active on public.assessments (is_archived, subject);
create index if not exists idx_assessments_recording on public.assessments (recording_id);

-- Keep recording.status in sync when an assessment is added.
create or replace function public.mark_recording_assessed()
returns trigger as $$
begin
  update public.recordings
  set status = 'completed'
  where id = new.recording_id and status = 'pending_assessment';
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_assessment_created on public.assessments;
create trigger on_assessment_created
  after insert on public.assessments
  for each row execute procedure public.mark_recording_assessed();

-- ---------------------------------------------------------------------------
-- settings_options
-- Configurable dropdown values (Subjects, Sections, Assessment Types) managed
-- from the System Settings page. Replaces the previously hardcoded lists.
-- ---------------------------------------------------------------------------
create table if not exists public.settings_options (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('subject', 'section', 'assessment_type')),
  value text not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (category, value)
);

create index if not exists idx_settings_options_category on public.settings_options (category, is_archived);

-- Seed a sensible starting set of options — safe to edit or remove afterward.
insert into public.settings_options (category, value) values
  ('subject', 'Information Management'),
  ('subject', 'System Integration and Architecture'),
  ('section', 'A'),
  ('section', 'B'),
  ('section', 'C'),
  ('assessment_type', 'Quiz'),
  ('assessment_type', 'Examination'),
  ('assessment_type', 'Activity'),
  ('assessment_type', 'Exercise')
on conflict (category, value) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Authenticated researchers/administrators can read and write research data.
-- Adjust these policies to fit your institution's access rules.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.recordings enable row level security;
alter table public.environmental_readings enable row level security;
alter table public.assessments enable row level security;
alter table public.settings_options enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Authenticated users can view devices"
  on public.devices for select using (auth.role() = 'authenticated');

create policy "Authenticated users can manage recordings"
  on public.recordings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage readings"
  on public.environmental_readings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage assessments"
  on public.assessments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage settings options"
  on public.settings_options for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Realtime
-- Enable realtime replication so Live Monitoring receives INSERT/UPDATE events.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.environmental_readings;
alter publication supabase_realtime add table public.recordings;
