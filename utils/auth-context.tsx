'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialSubscription?: Subscription | null;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialSubscription = null
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [subscription, setSubscription] = useState<Subscription | null>(
    initialSubscription
  );
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize auth state once
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setSubscription(initialSubscription);
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const supabase = createClient();

        // Clear any corrupted data first
        const storedToken = localStorage.getItem('supabase.auth.token');
        if (storedToken) {
          try {
            JSON.parse(storedToken);
          } catch {
            console.log('Corrupted token found, clearing...');
            localStorage.removeItem('supabase.auth.token');
          }
        }

        // Get current session
        const {
          data: { session },
          error: sessionError
        } = await supabase!.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setUser(null);
          setSubscription(null);
        } else if (mounted) {
          const currentUser = session?.user || null;
          setUser(currentUser);
          setError(null);

          // Fetch subscription if user exists
          if (currentUser) {
            await fetchSubscription(currentUser.id);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Authentication failed');
          setUser(null);
          setSubscription(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [initialUser, initialSubscription]);

  const fetchSubscription = async (userId: string) => {
    try {
      const supabase = createClient();
      if (!supabase) {
        console.error('Failed to create Supabase client');
        return;
      }

      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(
          `
          id,
          status,
          price_id,
          cancel_at,
          cancel_at_period_end,
          canceled_at,
          created,
          current_period_start,
          current_period_end,
          ended_at,
          trial_end,
          trial_start,
          user_id,
          metadata,
          quantity,
          role,
          prices:price_id (
            id,
            unit_amount,
            currency,
            interval,
            interval_count,
            trial_period_days,
            type,
            products:product_id (
              id,
              name,
              description,
              image,
              metadata
            )
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created', { ascending: false });

      const data = subscriptions?.[0] || null;

      // Log warning if multiple active subscriptions exist
      if (subscriptions && subscriptions.length > 1) {
        console.warn(
          `Warning: User ${userId} has ${subscriptions.length} active subscriptions. Using most recent.`
        );
      }

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        console.error('Subscription fetch error:', error);
      } else {
        setSubscription(data || null);
      }
    } catch (err) {
      console.error('Subscription fetch failed:', err);
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();

      // Clear state immediately
      setUser(null);
      setSubscription(null);
      setError(null);

      // Clear storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      // Sign out from Supabase
      await supabase!.auth.signOut();

      // Force redirect to home
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      // Even if sign out fails, clear everything and redirect
      window.location.href = '/';
    }
  };

  const refreshData = async () => {
    if (!user) return;

    try {
      await fetchSubscription(user.id);
    } catch (err) {
      console.error('Refresh data error:', err);
    }
  };

  const value: AuthContextType = {
    user,
    subscription,
    loading,
    error,
    signOut,
    refreshData
  };

  // Prevent hydration mismatch by showing loading state until mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ ...value, loading: true }}>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
