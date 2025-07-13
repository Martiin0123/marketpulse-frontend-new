-- Fix RLS policies for performance_refunds table
-- Add proper RLS policies to allow users to create and view their own refund requests

-- Enable RLS on performance_refunds table
ALTER TABLE performance_refunds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own performance refunds" ON performance_refunds;
DROP POLICY IF EXISTS "Users can create their own performance refunds" ON performance_refunds;
DROP POLICY IF EXISTS "Service role can manage all performance refunds" ON performance_refunds;

-- Create policies for authenticated users
-- Allow users to view their own refund requests
CREATE POLICY "Users can view their own performance refunds" 
ON performance_refunds 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow users to create their own refund requests
CREATE POLICY "Users can create their own performance refunds" 
ON performance_refunds 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all refund requests
CREATE POLICY "Service role can manage all performance refunds" 
ON performance_refunds 
FOR ALL 
TO service_role 
USING (true);

-- Grant permissions to service role
GRANT ALL ON performance_refunds TO service_role; 