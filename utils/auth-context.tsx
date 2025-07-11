'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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

  // Initialize auth state with listener to reduce manual requests
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setSubscription(initialSubscription);
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();

    // Set up auth state listener to automatically handle auth changes
    const {
      data: { subscription: authSubscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.expires_at);

      try {
        const currentUser = session?.user || null;
        setUser(currentUser);
        setError(null);

        // Fetch subscription if user exists and this is a sign-in or refresh event
        if (
          currentUser &&
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')
        ) {
          await fetchSubscription(currentUser.id);
        } else if (!currentUser || event === 'SIGNED_OUT') {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        if (mounted) {
          setError('Authentication failed');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    // Initial session check (only once)
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Initial session error:', error);
          setError(error.message);
        }

        if (mounted && session?.user) {
          setUser(session.user);
          await fetchSubscription(session.user.id);
        }
      } catch (err) {
        console.error('Initial session fetch error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [initialUser, initialSubscription]);

  // Rate limiting for subscription fetches
  const lastFetchTime = useRef<number>(0);
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchSubscription = async (userId: string, force = false) => {
    // Rate limit: only allow one request every 5 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 5000) {
      console.log('Subscription fetch rate limited, skipping...');
      return;
    }

    // Debounce: cancel any pending requests
    if (fetchTimeout.current) {
      clearTimeout(fetchTimeout.current);
    }

    fetchTimeout.current = setTimeout(async () => {
      try {
        lastFetchTime.current = now;
        const supabase = createClient();

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
    }, 500); // 500ms debounce
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
      await fetchSubscription(user.id, true); // Force refresh
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
