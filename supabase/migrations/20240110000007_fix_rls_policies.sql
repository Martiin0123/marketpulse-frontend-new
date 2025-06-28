-- Fix RLS policies for users table to allow signup functionality

-- Add insert policy for users table to allow new user creation
-- This is needed for both trigger-based and direct insertions during signup
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true);

-- Also allow service role to insert users directly if needed
-- Note: INSERT policies only use WITH CHECK, not USING
CREATE POLICY "Service role can insert users" ON users FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

-- Re-enable the user creation trigger with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  BEGIN
    -- Insert the user with referral data if provided
    INSERT INTO public.users (
      id, 
      full_name, 
      avatar_url,
      referred_by
    )
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'referred_by'
    );
    
    RETURN new;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 