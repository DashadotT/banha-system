import { supabase } from './supabase';
import type { SettingCategory, SettingOption } from '../types';

/**
 * Fetches active (non-archived) configurable options for a category.
 * Used to populate Subject / Section / Assessment Type dropdowns.
 */
export async function fetchSettingOptions(category: SettingCategory): Promise<SettingOption[]> {
  const { data, error } = await supabase
    .from('settings_options')
    .select('*')
    .eq('category', category)
    .eq('is_archived', false)
    .order('value', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SettingOption[];
}

/**
 * Fetches archived options for a category, for the Settings page's
 * "Archived" section.
 */
export async function fetchArchivedSettingOptions(
  category: SettingCategory
): Promise<SettingOption[]> {
  const { data, error } = await supabase
    .from('settings_options')
    .select('*')
    .eq('category', category)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SettingOption[];
}

/**
 * Adds a new configurable option (e.g. a new Subject or Section). If an
 * archived option with the exact same value already exists, it is restored
 * instead of inserting a duplicate (the category+value pair is unique).
 */
export async function addSettingOption(
  category: SettingCategory,
  value: string
): Promise<SettingOption> {
  const trimmed = value.trim();

  const { data: existing, error: existingError } = await supabase
    .from('settings_options')
    .select('*')
    .eq('category', category)
    .eq('value', trimmed)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (!existing.is_archived) {
      return existing as SettingOption;
    }
    const { data, error } = await supabase
      .from('settings_options')
      .update({ is_archived: false, archived_at: null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SettingOption;
  }

  const { data, error } = await supabase
    .from('settings_options')
    .insert({ category, value: trimmed, is_archived: false })
    .select()
    .single();
  if (error) throw error;
  return data as SettingOption;
}

/**
 * Renames an existing option's display value. Past assessments that already
 * reference the old text are historical records and are left unchanged —
 * only the dropdown label going forward is affected.
 */
export async function updateSettingOption(id: string, value: string): Promise<SettingOption> {
  const trimmed = value.trim();
  const { data, error } = await supabase
    .from('settings_options')
    .update({ value: trimmed })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SettingOption;
}

/**
 * Archives an option (soft delete) instead of permanently removing it, so
 * historical assessments that reference it are never orphaned. Archived
 * options simply stop appearing in dropdowns.
 */
export async function archiveSettingOption(id: string): Promise<void> {
  const { error } = await supabase
    .from('settings_options')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Restores a previously archived option so it reappears in dropdowns.
 */
export async function restoreSettingOption(id: string): Promise<void> {
  const { error } = await supabase
    .from('settings_options')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id);
  if (error) throw error;
}
