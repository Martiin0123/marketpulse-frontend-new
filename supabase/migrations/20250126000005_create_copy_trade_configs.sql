-- Create copy_trade_configs table for TradeSyncer-like functionality
CREATE TABLE IF NOT EXISTS copy_trade_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    destination_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    
    -- Configuration
    multiplier NUMERIC NOT NULL DEFAULT 1.0,
    enabled BOOLEAN DEFAULT true,
    
    -- Filters (for future use)
    min_rr NUMERIC,
    max_rr NUMERIC,
    symbols TEXT[],
    exclude_symbols TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_accounts CHECK (source_account_id != destination_account_id),
    CONSTRAINT positive_multiplier CHECK (multiplier > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_copy_trade_configs_user_id ON copy_trade_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_configs_source_account ON copy_trade_configs(source_account_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_configs_destination_account ON copy_trade_configs(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_configs_enabled ON copy_trade_configs(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE copy_trade_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own copy trade configs" ON copy_trade_configs;
CREATE POLICY "Users can view their own copy trade configs" ON copy_trade_configs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own copy trade configs" ON copy_trade_configs;
CREATE POLICY "Users can insert their own copy trade configs" ON copy_trade_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own copy trade configs" ON copy_trade_configs;
CREATE POLICY "Users can update their own copy trade configs" ON copy_trade_configs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own copy trade configs" ON copy_trade_configs;
CREATE POLICY "Users can delete their own copy trade configs" ON copy_trade_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE copy_trade_configs IS 'Stores copy trade configurations for automatically copying trades between accounts';
