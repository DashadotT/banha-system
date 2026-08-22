import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Fetches all researcher/administrator profiles for the Users page.
 * Auth credentials themselves are never exposed here — only profile rows.
 */
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return (data ?? []) as Profile[];
}
