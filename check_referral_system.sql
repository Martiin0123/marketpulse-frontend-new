-- Check if referral system is properly set up
-- Run this in your Supabase SQL editor

-- 1. Check if all tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('referral_codes', 'referrals', 'referral_rewards', 'referral_clicks')
ORDER BY table_name;

-- 2. Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('referral_codes', 'referrals', 'referral_rewards')
ORDER BY table_name, ordinal_position;

-- 3. Check foreign key constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('referral_codes', 'referrals', 'referral_rewards')
ORDER BY tc.table_name, kcu.column_name;

-- 4. Check unique constraints
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('referral_codes', 'referrals', 'referral_rewards');

-- 5. Check if functions exist
SELECT 
  routine_name,
  CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_referral_stats',
    'validate_referral_code', 
    'create_user_referral_code',
    'create_referral',
    'update_referral_code_clicks',
    'generate_referral_code'
  )
ORDER BY routine_name;

-- 6. Check function parameters
SELECT 
  routine_name,
  parameter_name,
  data_type
FROM information_schema.parameters 
WHERE parameter_schema = 'public'
  AND routine_name IN ('get_referral_stats', 'create_user_referral_code')
ORDER BY routine_name, ordinal_position;

-- 7. Check if there's any data
SELECT 
  'referral_codes' as table_name,
  COUNT(*) as row_count
FROM referral_codes
UNION ALL
SELECT 
  'referrals' as table_name,
  COUNT(*) as row_count
FROM referrals
UNION ALL
SELECT 
  'referral_rewards' as table_name,
  COUNT(*) as row_count
FROM referral_rewards
UNION ALL
SELECT 
  'referral_clicks' as table_name,
  COUNT(*) as row_count
FROM referral_clicks;

-- 8. Test function (replace with actual user ID)
-- SELECT create_user_referral_code('your-user-id-here', 'TestUser');
-- SELECT * FROM get_referral_stats('your-user-id-here'); 