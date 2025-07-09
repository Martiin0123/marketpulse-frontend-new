import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Global flags to prevent token refresh spam
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;
let lastRefreshTime = 0;
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refresh attempts
let authListenerAttached = false;

// Rate limiting for auth operations
const authRateLimit = {
  lastCall: 0,
  minInterval: 1000, // 1 second minimum between auth calls
  maxConcurrent: 1,
  currentCalls: 0
};

export const createClient = () => {
  if (!supabaseClient) {
    // Get environment variables without fallbacks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Validate environment variables are present
    if (!supabaseUrl || !supabaseAnonKey) {
      // Log error only once to prevent spam
      if (typeof window !== 'undefined' && !(window as any).__supabaseConfigError) {
        (window as any).__supabaseConfigError = true;
        console.error('❌ MISSING RAILWAY ENVIRONMENT VARIABLES:');
        console.error('Please set these in Railway dashboard:');
        console.error('- NEXT_PUBLIC_SUPABASE_URL');
        console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
        console.error('Current status:', {
          url: !!supabaseUrl,
          key: !!supabaseAnonKey,
          env: process.env.NODE_ENV
        });
      }
      
      throw new Error('Environment variables missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Railway dashboard.');
    }

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false, // Disable auto refresh to prevent spam
        persistSession: true,
        detectSessionInUrl: false, // Disable automatic session detection to reduce requests
        flowType: 'pkce'
      }
    });

    // Add auth state listener only once
    if (supabaseClient && !authListenerAttached) {
      authListenerAttached = true;
      
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const now = Date.now();
        
        // Prevent rapid-fire auth events
        if (now - authRateLimit.lastCall < authRateLimit.minInterval) {
          console.log('Auth rate limit: ignoring rapid auth event', event);
          return;
        }
        authRateLimit.lastCall = now;

        console.log('Auth state change:', event, !!session);
        
        if (event === 'TOKEN_REFRESHED') {
          isRefreshing = false;
          refreshPromise = null;
          lastRefreshTime = now;
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          isRefreshing = false;
          refreshPromise = null;
          lastRefreshTime = 0;
          console.log('User signed out');
        } else if (event === 'SIGNED_IN') {
          isRefreshing = false;
          refreshPromise = null;
          console.log('User signed in');
        }
      });
    }
  }
  return supabaseClient;
};

// Guarded function to prevent token refresh spam
export const guardedTokenRefresh = async () => {
  const now = Date.now();
  
  // Check if we're already refreshing
  if (isRefreshing && refreshPromise) {
    console.log('Token refresh already in progress, waiting...');
    return refreshPromise;
  }
  
  // Check minimum interval
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    console.log('Token refresh rate limited, using existing session');
    return Promise.resolve();
  }
  
  // Check concurrent calls
  if (authRateLimit.currentCalls >= authRateLimit.maxConcurrent) {
    console.log('Too many concurrent auth calls, skipping refresh');
    return Promise.resolve();
  }
  
  const client = createClient();
  if (!client) return Promise.resolve();
  
  isRefreshing = true;
  authRateLimit.currentCalls++;
  
  try {
    refreshPromise = client.auth.refreshSession();
    const result = await refreshPromise;
    lastRefreshTime = now;
    return result;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
    authRateLimit.currentCalls--;
  }
};
