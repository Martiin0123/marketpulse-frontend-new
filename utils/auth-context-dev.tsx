'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef
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
  const [loading, setLoading] = useState(false); // Start as false to prevent initial loading
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const supabase = createClient();

  // Initialize auth state only once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user session
        const {
          data: { user: currentUser },
          error: userError
        } = await supabase.auth.getUser();

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

              if (!subError) {
                setSubscription(subData);
              }
            } catch (subError) {
              console.error('Subscription fetch error:', subError);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    // Only initialize if we don't have initial data
    if (!initialUser && !initialSubscription) {
      initializeAuth();
    } else {
      setLoading(false);
    }

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setError(null);

        // Fetch subscription for new user
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
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .single();

          if (!subError) {
            setSubscription(subData);
          }
        } catch (subError) {
          console.error('Subscription fetch error on auth change:', subError);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSubscription(null);
        setError(null);
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []); // Empty dependency array

  const refreshUser = async () => {
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
    if (!user) return;

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
