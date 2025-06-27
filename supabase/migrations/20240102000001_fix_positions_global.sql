-- Make positions global by removing user_id constraint and updating policies
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_id_fkey;
ALTER TABLE positions ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing user-specific policies
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can insert own positions" ON positions;
DROP POLICY IF EXISTS "Users can update own positions" ON positions;

-- Create new global policies for subscribed users
CREATE POLICY "Subscribed users can view all positions" ON positions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = auth.uid() 
    AND status IN ('trialing', 'active')
  )
);

-- Allow system/API to insert positions (for TradingView webhook)
CREATE POLICY "Allow API to insert positions" ON positions FOR INSERT WITH CHECK (true);

-- Allow system/API to update positions 
CREATE POLICY "Allow API to update positions" ON positions FOR UPDATE USING (true); 