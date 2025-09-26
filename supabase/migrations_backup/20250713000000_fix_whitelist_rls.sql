-- Fix RLS policies for whitelist_requests table
-- Remove the problematic admin policy that tries to access auth.users table

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can manage all whitelist requests" ON whitelist_requests;

-- Create a simpler admin policy that doesn't access auth.users
CREATE POLICY "Service role can manage all whitelist requests" ON whitelist_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Keep the existing user policies
-- Users can view their own whitelist requests
-- Users can insert their own whitelist requests

-- Grant permissions to service role
GRANT ALL ON whitelist_requests TO service_role; 