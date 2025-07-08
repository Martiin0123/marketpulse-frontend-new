import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Define a function to create a Supabase client for client-side operations
export const createClient = () => {
  if (!supabaseClient) {
    // Check both process.env and window for environment variables (Render compatibility)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       (typeof window !== 'undefined' ? window.process?.env?.NEXT_PUBLIC_SUPABASE_URL : null);
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                           (typeof window !== 'undefined' ? window.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : null);

    // Debug logging for production
    if (process.env.NODE_ENV === 'production') {
      console.log('Environment check:', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        env: process.env.NODE_ENV,
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
