-- Fix RLS policies for trade_entries table
-- This ensures trades can be inserted by authenticated users for their own accounts
-- Server-side sync operations use admin client which bypasses RLS

-- Ensure RLS is enabled
ALTER TABLE trade_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view trade entries for their accounts" ON trade_entries;
DROP POLICY IF EXISTS "Users can insert trade entries for their accounts" ON trade_entries;
DROP POLICY IF EXISTS "Users can update trade entries for their accounts" ON trade_entries;
DROP POLICY IF EXISTS "Users can delete trade entries for their accounts" ON trade_entries;

-- Recreate policies with proper checks

-- View policy: Users can view trade entries for their accounts
CREATE POLICY "Users can view trade entries for their accounts" ON trade_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Insert policy: Users can insert trade entries for their accounts
CREATE POLICY "Users can insert trade entries for their accounts" ON trade_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Update policy: Users can update trade entries for their accounts
CREATE POLICY "Users can update trade entries for their accounts" ON trade_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Delete policy: Users can delete trade entries for their accounts
CREATE POLICY "Users can delete trade entries for their accounts" ON trade_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trading_accounts 
      WHERE trading_accounts.id = trade_entries.account_id 
      AND trading_accounts.user_id = auth.uid()
    )
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'trade_entries'
ORDER BY policyname;

