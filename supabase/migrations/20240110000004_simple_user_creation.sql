-- Simplify user creation to avoid database errors during signup

-- Create a simple, reliable handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Simply insert the user without any complex referral logic
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a separate function to generate referral codes after user creation
-- This will be called asynchronously to avoid blocking signup
CREATE OR REPLACE FUNCTION create_user_referral_code(user_id uuid, user_name text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  new_code text;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO new_code FROM users WHERE id = user_id AND referral_code IS NOT NULL;
  
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate a new referral code
  new_code := generate_referral_code(user_name);
  
  -- Insert into referral_codes table
  INSERT INTO referral_codes (user_id, code)
  VALUES (user_id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update user with referral code
  UPDATE users SET referral_code = new_code WHERE id = user_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 