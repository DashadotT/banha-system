import { supabase } from './supabase';
import type { SettingCategory, SettingOption } from '../types';

/**
 * Fetches configurable options, optionally filtered to a single category.
 * Used to populate Subject / Section / Assessment Type dropdowns.
 */
export async function fetchSettingOptions(category?: SettingCategory): Promise<SettingOption[]> {
  let query = supabase.from('settings_options').select('*').order('value', { ascending: true });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SettingOption[];
}

/**
 * Adds a new configurable option (e.g. a new Subject or Section).
 */
export async function addSettingOption(
  category: SettingCategory,
  value: string
): Promise<SettingOption> {
  const trimmed = value.trim();
  const { data, error } = await supabase
    .from('settings_options')
    .insert({ category, value: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data as SettingOption;
}

/**
 * Removes a configurable option. Existing assessments that reference the
 * removed value keep their historical text — only the dropdown list shrinks.
 */
export async function deleteSettingOption(id: string): Promise<void> {
  const { error } = await supabase.from('settings_options').delete().eq('id', id);
  if (error) throw error;
}
