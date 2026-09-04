import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase.js';
import { api } from '../lib/api.js';
import { Profile } from '@researchos/shared-types';

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  roleRequest: 'Researcher' | 'Supervisor';
  institution: string;
  department: string;
  researchFieldTags?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const p = await api.getMe();
      setProfile(p);
      return p;
    } catch (err) {
      console.warn('Could not fetch live profile from Express API:', err);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile();
      }
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
      await fetchProfile();
    }
    setLoading(false);
    return { error };
  };

  const signUp = async (params: SignUpParams) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          fullName: params.fullName,
          roleRequest: params.roleRequest,
          institution: params.institution,
          department: params.department,
          researchFieldTags: params.researchFieldTags || [],
        },
      },
    });

    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
      await fetchProfile();
    }
    setLoading(false);
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/complete-profile`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (err: any) {
      console.error('Google OAuth exception:', err);
      return { error: err as AuthError };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    return await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
