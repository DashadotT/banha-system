-- =============================================================================
-- BANHA — Seed Data
-- Run this after 01_schema.sql. Safe to re-run (uses ON CONFLICT upserts).
-- =============================================================================


-- =============================================================================
-- DEFAULT SETTINGS
-- Starter Subjects / Sections / Assessment Types shown in the Assessment
-- form's dropdowns. Edit or add more later from the System Settings page.
-- =============================================================================

insert into public.settings_options (
  category,
  value
)
values

  (
    'subject',
    'Information Management'
  ),

  (
    'subject',
    'System Integration and Architecture'
  ),

  (
    'section',
    'A'
  ),

  (
    'section',
    'B'
  ),

  (
    'section',
    'C'
  ),

  (
    'assessment_type',
    'Quiz'
  ),

  (
    'assessment_type',
    'Examination'
  ),

  (
    'assessment_type',
    'Activity'
  ),

  (
    'assessment_type',
    'Exercise'
  )

on conflict (
  category,
  value
)
do nothing;


-- =============================================================================
-- TEST DEVICE
--
-- MUST MATCH DEVICE_ID IN NODE 2
-- =============================================================================

insert into public.devices (
  id,
  device_name,
  node_number,
  status
)
values (
  '11111111-1111-1111-1111-111111111111',
  'BANHA Node 1 Sensor Device',
  1,
  'online'
)

on conflict (id)
do update

set
  device_name = excluded.device_name,
  node_number = excluded.node_number,
  status = excluded.status;
