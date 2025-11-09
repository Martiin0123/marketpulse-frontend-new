-- Rename tradovate_accounts to broker_connections for multi-broker support
-- Only rename if table exists (for fresh installs, table might not exist yet)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tradovate_accounts') THEN
        ALTER TABLE tradovate_accounts RENAME TO broker_connections;
    END IF;
END $$;

-- Create broker_connections table if it doesn't exist (for fresh installs)
CREATE TABLE IF NOT EXISTS broker_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    
    -- Broker type
    broker_type TEXT NOT NULL DEFAULT 'tradovate',
    
    -- OAuth credentials (encrypted)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Broker account info (generic names)
    broker_user_id TEXT,
    broker_username TEXT,
    broker_account_name TEXT,
    
    -- Sync settings
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status TEXT, -- 'success' | 'error' | 'pending'
    last_sync_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One broker connection per trading account per broker type
    UNIQUE(trading_account_id, broker_type)
);

-- Add broker_type column to support multiple brokers (if table was renamed)
ALTER TABLE broker_connections
    ADD COLUMN IF NOT EXISTS broker_type TEXT NOT NULL DEFAULT 'tradovate';

-- Update existing records to have broker_type
UPDATE broker_connections SET broker_type = 'tradovate' WHERE broker_type IS NULL OR broker_type = '';

-- Add constraint for valid broker types
ALTER TABLE broker_connections
    DROP CONSTRAINT IF EXISTS check_broker_type;

ALTER TABLE broker_connections
    ADD CONSTRAINT check_broker_type
    CHECK (broker_type IN ('tradovate', 'projectx'));

-- Rename tradovate-specific columns to generic names (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'broker_connections' AND column_name = 'tradovate_user_id') THEN
        ALTER TABLE broker_connections RENAME COLUMN tradovate_user_id TO broker_user_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'broker_connections' AND column_name = 'tradovate_username') THEN
        ALTER TABLE broker_connections RENAME COLUMN tradovate_username TO broker_username;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'broker_connections' AND column_name = 'tradovate_account_name') THEN
        ALTER TABLE broker_connections RENAME COLUMN tradovate_account_name TO broker_account_name;
    END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_tradovate_accounts_user_id;
DROP INDEX IF EXISTS idx_tradovate_accounts_trading_account_id;

CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_trading_account_id ON broker_connections(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_broker_type ON broker_connections(broker_type);

-- Enable RLS if not already enabled
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;

-- Create/Update RLS policies
DROP POLICY IF EXISTS "Users can view their own broker connections" ON broker_connections;
CREATE POLICY "Users can view their own broker connections" ON broker_connections
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own broker connections" ON broker_connections;
CREATE POLICY "Users can insert their own broker connections" ON broker_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own broker connections" ON broker_connections;
CREATE POLICY "Users can update their own broker connections" ON broker_connections
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own broker connections" ON broker_connections;
CREATE POLICY "Users can delete their own broker connections" ON broker_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_broker_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_broker_connections_updated_at ON broker_connections;
CREATE TRIGGER update_broker_connections_updated_at
    BEFORE UPDATE ON broker_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_broker_connections_updated_at();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

