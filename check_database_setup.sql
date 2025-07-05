-- Database Setup Diagnostic Script
-- Run this in your Supabase SQL Editor to check if everything is set up correctly

-- 1. Check if all required tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'customers',
    'products', 
    'prices',
    'subscriptions',
    'signals',
    'positions',
    'portfolio',
    'referral_codes',
    'referrals',
    'referral_rewards',
    'referral_clicks'
  )
ORDER BY table_name;

-- 2. Check if enum types exist
SELECT 
  typname as enum_name,
  CASE WHEN typname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_type 
WHERE typname IN ('pricing_plan_interval', 'pricing_type', 'subscription_status')
ORDER BY typname;

-- 3. Check if functions exist
SELECT 
  routine_name,
  CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'generate_referral_code',
    'create_user_referral_code',
    'get_referral_stats',
    'validate_referral_code',
    'update_referral_code_clicks',
    'create_referral',
    'update_referral_on_subscription',
    'check_eligible_rewards',
    'cancel_referral_rewards',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- 4. Check if triggers exist
SELECT 
  trigger_name,
  CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name IN (
    'trigger_update_referral_on_subscription',
    'trigger_cancel_referral_rewards',
    'trigger_update_referral_codes_updated_at',
    'trigger_update_referrals_updated_at',
    'trigger_update_positions_updated_at'
  )
ORDER BY trigger_name;

-- 5. Check sample data in products table
SELECT 
  'Products' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '❌ NO DATA' END as status
FROM public.products;

-- 6. Check sample data in prices table
SELECT 
  'Prices' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '❌ NO DATA' END as status
FROM public.prices;

-- 7. Check sample data in signals table
SELECT 
  'Signals' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '❌ NO DATA' END as status
FROM public.signals;

-- 8. Check foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE WHEN tc.constraint_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 9. Check indexes
SELECT 
  indexname,
  tablename,
  CASE WHEN indexname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- 10. Test referral functions
SELECT 'Testing referral functions...' as test;

-- Test generate_referral_code function
SELECT 
  'generate_referral_code' as function_name,
  CASE WHEN generate_referral_code('TestUser') IS NOT NULL THEN '✅ WORKS' ELSE '❌ FAILS' END as status;

-- Test validate_referral_code function (should return false for non-existent code)
SELECT 
  'validate_referral_code' as function_name,
  CASE WHEN (SELECT valid FROM validate_referral_code('INVALID123')) = false THEN '✅ WORKS' ELSE '❌ FAILS' END as status;

-- 11. Check permissions
SELECT 
  grantee,
  table_name,
  privilege_type,
  CASE WHEN privilege_type IS NOT NULL THEN '✅ GRANTED' ELSE '❌ MISSING' END as status
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- 12. Summary
SELECT '=== DATABASE SETUP SUMMARY ===' as summary;

SELECT 
  'Tables' as category,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 11 THEN '✅ COMPLETE' ELSE '❌ INCOMPLETE' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'customers', 'products', 'prices', 'subscriptions', 'signals', 
    'positions', 'portfolio', 'referral_codes', 'referrals', 
    'referral_rewards', 'referral_clicks'
  );

SELECT 
  'Functions' as category,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 10 THEN '✅ COMPLETE' ELSE '❌ INCOMPLETE' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'generate_referral_code', 'create_user_referral_code', 'get_referral_stats',
    'validate_referral_code', 'update_referral_code_clicks', 'create_referral',
    'update_referral_on_subscription', 'check_eligible_rewards', 
    'cancel_referral_rewards', 'update_updated_at_column'
  );

SELECT 
  'Sample Data' as category,
  CASE WHEN 
    (SELECT COUNT(*) FROM public.products) > 0 AND
    (SELECT COUNT(*) FROM public.prices) > 0 AND
    (SELECT COUNT(*) FROM public.signals) > 0
  THEN '✅ PRESENT' ELSE '❌ MISSING' END as status; 