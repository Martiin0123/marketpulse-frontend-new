-- Disable all custom triggers to test raw auth functionality

-- Drop all our custom triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_generate_referral_code ON users;

-- Drop all our custom functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.safe_handle_new_user();
DROP FUNCTION IF EXISTS create_referral_code_for_user();
DROP FUNCTION IF EXISTS generate_referral_code(text);

-- Enable RLS back on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure we have proper insert policy for users
DROP POLICY IF EXISTS "System can insert users" ON users;
CREATE POLICY "System can insert users" ON users FOR INSERT WITH CHECK (true); 