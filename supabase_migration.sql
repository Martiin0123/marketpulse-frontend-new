-- Migration to add RR-based fields to trade_entries table
-- Run this in your Supabase SQL editor

-- Add max_adverse column for tracking maximum adverse excursion
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS max_adverse DECIMAL(8,4);

-- Add risk_multiplier column for dynamic sizing (0.5x, 1x, 2x)
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS risk_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- Drop existing constraint if it exists (to avoid errors on re-run)
ALTER TABLE trade_entries 
DROP CONSTRAINT IF EXISTS check_risk_multiplier;

-- Add check constraint for risk_multiplier (only allow 0.5, 1.0, or 2.0)
ALTER TABLE trade_entries 
ADD CONSTRAINT check_risk_multiplier 
CHECK (risk_multiplier IS NULL OR risk_multiplier IN (0.5, 1.0, 2.0));

-- Update existing records to have default risk_multiplier of 1.0 if null
UPDATE trade_entries 
SET risk_multiplier = 1.0 
WHERE risk_multiplier IS NULL;

-- Refresh schema cache (for Supabase PostgREST)
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'trade_entries' 
  AND column_name IN ('max_adverse', 'risk_multiplier')
ORDER BY ordinal_position;

