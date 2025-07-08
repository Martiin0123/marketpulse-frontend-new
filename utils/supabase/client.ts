import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Define a function to create a Supabase client for client-side operations
export const createClient = () => {
  if (!supabaseClient) {
    // Multiple fallback methods for environment variables (Render compatibility)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL) ||
                       'https://aehfqzahaorltbhfctsd.supabase.co'; // Fallback to your known URL
    
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                           (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
                           'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaGZxemFoYW9ybHRiaGZjdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTUzMTEsImV4cCI6MjA2NzI3MTMxMX0.Ehzjr0Xr1e4IsigAnQmzxNc8z8ql9hJyfkWSfdPSJL4'; // Fallback to your known key

    // Debug logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log('Environment check:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        env: process.env.NODE_ENV,
        urlSource: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'process.env' : 'fallback',
        keySource: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'process.env' : 'fallback',
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
      });
    }

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        env: process.env.NODE_ENV,
        availableEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
      });
      
      // More helpful error message for production
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Supabase configuration missing. Please check your Render environment variables.'
        : 'Missing Supabase environment variables. Please check your .env file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.';
      
      throw new Error(errorMessage);
    }

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};
