'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Profile type from database
type Profile = Database['public']['Tables']['profiles']['Row'];

// Subscription tier type
type SubscriptionTier = 'free' | 'starter' | 'pro' | 'team';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create client lazily to avoid SSR issues
function getSupabaseClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined') return null;
  return createClient();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const syncAttemptedRef = useRef<string | null>(null);
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  // Initialize on client-side only
  useEffect(() => {
    setIsClient(true);
    supabaseRef.current = getSupabaseClient();
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabaseRef.current) return null;
    const { data, error } = await supabaseRef.current
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }, []);

  // Refresh profile data (can be called after subscription changes)
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Sync wordsets when user logs in
  useEffect(() => {
    const performSync = async () => {
      if (!user || syncAttemptedRef.current === user.id) return;

      // Mark that we're attempting sync for this user
      syncAttemptedRef.current = user.id;

      // Dynamically import to avoid SSR issues with IndexedDB
      const { syncLocalWordsetsToSupabase, hasSyncedWordsets } = await import(
        '@/lib/utils/wordsetSync'
      );

      // Check if sync is needed
      if (!hasSyncedWordsets(user.id)) {
        console.log('[Auth] Syncing local wordsets to cloud...');
        const result = await syncLocalWordsetsToSupabase(user.id);
        if (result.error) {
          console.error('[Auth] Wordset sync error:', result.error);
        } else {
          console.log(
            `[Auth] Wordset sync complete: ${result.synced} synced, ${result.skipped} skipped`
          );
        }
      }
    };

    performSync();
  }, [user]);

  useEffect(() => {
    if (!isClient || !supabaseRef.current) return;

    const supabase = supabaseRef.current;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch profile if user is logged in
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch or clear profile based on auth state
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isClient, fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabaseRef.current) return { error: null };
    const { error } = await supabaseRef.current.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  // Computed subscription values
  const subscriptionTier: SubscriptionTier = profile?.subscription_tier ?? 'free';
  const isPremium = subscriptionTier !== 'free' && profile?.subscription_status === 'active';

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isPremium,
      subscriptionTier,
      signIn,
      signUp,
      signInWithOAuth,
      signInWithMagicLink,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      isPremium,
      subscriptionTier,
      signIn,
      signUp,
      signInWithOAuth,
      signInWithMagicLink,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
