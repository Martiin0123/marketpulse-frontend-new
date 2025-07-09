import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Define a function to create a Supabase client for client-side operations
// Global flag to prevent multiple refresh attempts
let isRefreshing = false;

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

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

    // Add global auth state change listener with guards
    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          isRefreshing = false;
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          isRefreshing = false;
          console.log('User signed out');
        }
      });
    }
  }
  return supabaseClient;
};
