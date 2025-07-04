-- Test referral functions
-- Run this in your Supabase SQL editor to check if functions are working

-- Test 1: Check if get_referral_stats function exists and works
SELECT 
  routine_name, 
  routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_referral_stats' 
  AND routine_schema = 'public';

-- Test 2: Check if referral_codes table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%referral%';

-- Test 3: Check if there are any referral codes
SELECT * FROM referral_codes LIMIT 5;

-- Test 4: Try to create a test referral code (replace with actual user ID)
-- SELECT create_user_referral_code('your-user-id-here', 'TestUser');

-- Test 5: Check function parameters
SELECT 
  parameter_name,
  parameter_mode,
  data_type
FROM information_schema.parameters 
WHERE specific_name LIKE '%get_referral_stats%'
  AND parameter_schema = 'public'; 