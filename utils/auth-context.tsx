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
import {
  guardedRefresh,
  debounceAuth,
  authCircuitBreaker
} from '@/utils/supabase/auth-guards';
import { checkAndRecoverSession } from '@/utils/supabase/session-recovery';

type Subscription = Tables<'subscriptions'>;

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
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

  // Safely create Supabase client with error handling
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    supabase = createClient();
  } catch (clientError) {
    console.error('Failed to initialize Supabase client:', clientError);
    setError(
      'Failed to initialize authentication. Please check your configuration.'
    );
    setLoading(false);
  }

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mountedLocal = true;

    const initializeAuth = async () => {
      // Don't proceed if Supabase client failed to initialize
      if (!supabase) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check and recover from corrupted session first
        const wasCorrupted = await checkAndRecoverSession();
        if (wasCorrupted) {
          console.log('Session was corrupted and cleared, waiting for reload...');
          return; // Page will reload
        }

        // Use getSession with error handling for refresh token issues
        let session = null;
        let currentUser = null;
        let userError = null;
        
        try {
          const sessionResult = await supabase.auth.getSession();
          session = sessionResult.data.session;
          currentUser = session?.user || null;
          userError = sessionResult.error;
        } catch (error: any) {
          console.error('Session fetch failed:', error);
          
          // Handle refresh token errors gracefully
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('Cannot read properties of undefined')) {
            console.log('Session error detected, triggering recovery');
            
            // Trigger session recovery
            const recovered = await checkAndRecoverSession();
            if (recovered) {
              return; // Page will reload
            }
          }
          
          userError = error;
        }

        if (!mountedLocal) return;

        if (userError) {
          console.error('Auth initialization error:', userError);
          setError(userError.message);
          setUser(null);
          setSubscription(null);
        } else {
          setUser(currentUser);

          // If we have a user, get their subscription
          if (currentUser) {
            try {
              const { data: subData, error: subError } = await supabase
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
                .eq('user_id', currentUser.id)
                .eq('status', 'active')
                .single();

              if (!subError && mountedLocal) {
                // Ensure currency is always a string
                if (
                  subData?.prices?.currency &&
                  typeof subData.prices.currency !== 'string'
                ) {
                  subData.prices.currency = String(subData.prices.currency);
                }
                setSubscription(subData);
              }
            } catch (subError) {
              console.error('Subscription fetch error:', subError);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mountedLocal) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mountedLocal) {
          setLoading(false);
        }
      }
    };

    // Only initialize if we don't have initial data
    if (!initialUser && !initialSubscription) {
      initializeAuth();
    } else {
      setLoading(false);
    }

    // Don't set up auth listener here - it's already handled in the Supabase client
    // This prevents multiple listeners which cause token refresh spam

    return () => {
      mountedLocal = false;
    };
  }, [initialUser, initialSubscription]); // Keep stable dependencies only

  const refreshUser = async () => {
    if (!supabase) {
      setError('Authentication service not available');
      return;
    }

    try {
      const {
        data: { user: currentUser },
        error
      } = await supabase.auth.getUser();
      if (error) {
        setError(error.message);
        setUser(null);
      } else {
        setUser(currentUser);
        setError(null);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to refresh user');
    }
  };

  const refreshSubscription = async () => {
    if (!user || !supabase) return;

    try {
      const { data: subData, error } = await supabase
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
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Subscription refresh error:', error);
        setSubscription(null);
      } else {
        setSubscription(subData);
      }
    } catch (err) {
      console.error('Error refreshing subscription:', err);
    }
  };

  const value: AuthContextType = {
    user,
    subscription,
    loading,
    error,
    refreshUser,
    refreshSubscription
  };

  // Prevent hydration mismatch by only rendering after component is mounted
  if (!mounted) {
    return <AuthContext.Provider value={value}>{null}</AuthContext.Provider>;
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
