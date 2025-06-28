-- Temporarily disable the user creation trigger to test signup without it

-- Drop the trigger entirely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; 