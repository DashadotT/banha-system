-- =============================================================================
-- BANHA — Seed Data
-- Run this after 01_schema.sql. Safe to re-run (uses ON CONFLICT upserts).
-- =============================================================================
-- =============================================================================
-- DEFAULT SETTINGS
-- Starter Subjects / Sections / Assessment Types shown in the Assessment
-- form's dropdowns. Edit or add more later from the System Settings page.
-- =============================================================================
insert into
  public.settings_options (category, value)
values
  ('subject', 'Information Management'),
  ('subject', 'System Integration and Architecture'),
  ('section', 'A'),
  ('section', 'B'),
  ('section', 'C'),
  ('assessment_type', 'Quiz'),
  ('assessment_type', 'Examination'),
  ('assessment_type', 'Activity'),
  ('assessment_type', 'Exercise') on conflict (category, value) do nothing;