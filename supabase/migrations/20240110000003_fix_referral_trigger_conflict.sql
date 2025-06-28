-- Fix the referral code trigger conflict that's causing database errors during signup

-- First, drop the problematic trigger that tries to update users after insert
DROP TRIGGER IF EXISTS on_user_created_generate_referral_code ON users;

-- Update the handle_new_user function to generate referral codes during initial insert
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  new_referral_code text;
BEGIN
  -- Generate a referral code during user creation
  new_referral_code := generate_referral_code(new.raw_user_meta_data->>'full_name');
  
  -- Insert the user with the referral code included
  INSERT INTO public.users (
    id, 
    full_name, 
    avatar_url,
    referred_by,
    referral_code
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'referred_by',
    new_referral_code
  );
  
  -- Also insert the referral code into the referral_codes table
  INSERT INTO referral_codes (user_id, code)
  VALUES (new.id, new_referral_code);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 