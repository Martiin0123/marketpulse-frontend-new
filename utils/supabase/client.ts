import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Singleton pattern to prevent multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Define a function to create a Supabase client for client-side operations
export const createClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      // Pass Supabase URL and anonymous key from the environment to the client
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
};
