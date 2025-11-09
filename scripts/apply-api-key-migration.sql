-- Quick script to apply the api_base_url column migration
-- Run this in your Supabase SQL editor if the migration hasn't been applied

-- Add API key support columns if they don't exist
ALTER TABLE broker_connections
    ADD COLUMN IF NOT EXISTS api_key TEXT,
    ADD COLUMN IF NOT EXISTS api_secret TEXT,
    ADD COLUMN IF NOT EXISTS api_username TEXT,
    ADD COLUMN IF NOT EXISTS api_service_type TEXT,
    ADD COLUMN IF NOT EXISTS api_base_url TEXT,
    ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'oauth' CHECK (auth_method IN ('oauth', 'api_key'));

-- Make OAuth fields nullable (for API key connections)
ALTER TABLE broker_connections
    ALTER COLUMN access_token DROP NOT NULL,
    ALTER COLUMN refresh_token DROP NOT NULL,
    ALTER COLUMN token_expires_at DROP NOT NULL;

-- Update existing records to use OAuth method
UPDATE broker_connections SET auth_method = 'oauth' WHERE auth_method IS NULL;

-- Add index for API key lookups
CREATE INDEX IF NOT EXISTS idx_broker_connections_auth_method ON broker_connections(auth_method, broker_type);

