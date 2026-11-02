import { supabase } from './supabase';
import type { Profile } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signs a user in with email + password via Supabase Auth.
 */
export async function signIn({ email, password }: LoginCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Asks Supabase to email a password-recovery link. Supabase answers the same
 * way whether or not the address belongs to an account, so callers must show
 * neutral wording. Only existing Auth users can ever receive a link — this
 * never creates an account.
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

/**
 * Sets a new password for the account of the current (recovery) session.
 * Only the Auth password changes — no profile or application data is touched.
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Signs the current user out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Returns the currently authenticated session, if any.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Fetches the profile row (role, name, status) for a given auth user id.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no row found
    throw error;
  }
  return data as Profile;
}

/**
 * Updates the current user's display name. RLS restricts this to the
 * profile's own row (see "Users can update their own profile" policy).
 */
export async function updateProfileName(userId: string, fullName: string): Promise<Profile> {
  const trimmed = fullName.trim();
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

/**
 * Subscribes to Supabase auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc).
 */
export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}
