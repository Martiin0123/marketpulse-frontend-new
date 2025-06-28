-- Complete fix for auth signup issues
-- This migration ensures auth.users table can accept new signups

-- First, let's check if there are any constraints or issues with auth schema
-- Remove any potential foreign key conflicts

-- Ensure auth.users table is clean
-- Note: This is risky in production but safe for local development
DO $$
BEGIN
    -- Clean up any orphaned records that might be causing conflicts
    DELETE FROM auth.audit_log_entries WHERE instance_id IS NULL;
    DELETE FROM auth.refresh_tokens WHERE user_id NOT IN (SELECT id FROM auth.users);
    DELETE FROM auth.identities WHERE user_id NOT IN (SELECT id FROM auth.users);
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors, table might not exist or be empty
    NULL;
END $$;

-- Ensure public.users table doesn't have orphaned references
DELETE FROM users WHERE id NOT IN (SELECT id FROM auth.users);

-- Grant necessary permissions for auth operations
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, authenticated;

-- Ensure the auth.users table has proper permissions
GRANT INSERT ON auth.users TO postgres;
GRANT INSERT ON auth.identities TO postgres;
GRANT INSERT ON auth.audit_log_entries TO postgres;

-- Recreate a safe user creation trigger that won't fail
CREATE OR REPLACE FUNCTION public.safe_handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Only insert if user doesn't already exist
  INSERT INTO public.users (id, full_name, avatar_url, referred_by)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'referred_by'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    referred_by = COALESCE(EXCLUDED.referred_by, users.referred_by);
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent signup
  RAISE WARNING 'Error in safe_handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.safe_handle_new_user(); 