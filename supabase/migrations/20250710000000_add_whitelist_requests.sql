-- Create whitelist_requests table for VIP users
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bybit_uid VARCHAR(20) NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(user_id, bybit_uid)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_user_id ON whitelist_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_status ON whitelist_requests(status);
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_created_at ON whitelist_requests(created_at);

-- Enable RLS
ALTER TABLE whitelist_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own whitelist requests" ON whitelist_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own whitelist requests" ON whitelist_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policy for managing whitelist requests
CREATE POLICY "Admins can manage all whitelist requests" ON whitelist_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE email LIKE '%@marketpulse.com'
      )
    )
  );

-- Add comment
COMMENT ON TABLE whitelist_requests IS 'Stores VIP user whitelist requests for Bybit automatic trading access'; 