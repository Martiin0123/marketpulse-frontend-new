import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types_db';

// Optimized client with proper configuration to reduce auth requests
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const createClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

// Simple auth functions
export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const supabase = createClient();
  
  // Clear all storage first
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  
  // Then sign out
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};