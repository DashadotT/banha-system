import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { getProfile, signIn, signOut } from '../services/authService';
import type { LoginCredentials } from '../services/authService';
import type { Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
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

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
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
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      isAuthenticated: Boolean(session),
      login,
      logout,
      setProfile,
    }),
    [session, profile, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
