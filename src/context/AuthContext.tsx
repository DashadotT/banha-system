import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { getProfile, signIn, signOut } from '../services/authService';
import type { LoginCredentials } from '../services/authService';
import type { Profile } from '../types';
import { RECOVERY_FLAG_KEY } from '../utils/passwordRecovery';

function readRecoveryFlag(): boolean {
  try {
    return window.localStorage.getItem(RECOVERY_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function writeRecoveryFlag(on: boolean) {
  try {
    if (on) window.localStorage.setItem(RECOVERY_FLAG_KEY, '1');
    else window.localStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    // storage unavailable — recovery state then only lasts for this page load
  }
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  /** True while the session comes from a password-recovery link (not a real sign-in). */
  isRecovery: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  /** Updates the cached profile in-place (e.g. after editing the display name). */
  setProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState<boolean>(readRecoveryFlag);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        try {
          const p = await getProfile(data.session.user.id);
          if (mounted) setProfile(p);
        } catch {
          // profile row may not exist yet; ignore
        }
      }
      if (mounted) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        writeRecoveryFlag(true);
        setIsRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        writeRecoveryFlag(false);
        setIsRecovery(false);
      }
      setSession(newSession);
      if (newSession?.user) {
        try {
          const p = await getProfile(newSession.user.id);
          if (mounted) setProfile(p);
        } catch {
          if (mounted) setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await signIn(credentials);
    // A genuine sign-in replaces any leftover recovery session.
    writeRecoveryFlag(false);
    setIsRecovery(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } finally {
      writeRecoveryFlag(false);
      setIsRecovery(false);
      setProfile(null);
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      isRecovery,
      // A recovery link only proves access to the email; the researcher must
      // set a new password (or sign in normally) before using BANHA.
      isAuthenticated: Boolean(session) && !isRecovery,
      login,
      logout,
      setProfile,
    }),
    [session, profile, isLoading, isRecovery, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
