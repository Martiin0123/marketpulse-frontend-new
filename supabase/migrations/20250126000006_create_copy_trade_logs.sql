-- Create copy_trade_logs table to track copy trade execution history
CREATE TABLE IF NOT EXISTS copy_trade_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    copy_trade_config_id UUID NOT NULL REFERENCES copy_trade_configs(id) ON DELETE CASCADE,
    
    -- Source trade info
    source_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    source_trade_id UUID REFERENCES trade_entries(id) ON DELETE SET NULL,
    source_symbol TEXT NOT NULL,
    source_side TEXT NOT NULL, -- 'BUY' | 'SELL' | 'long' | 'short'
    source_quantity NUMERIC NOT NULL,
    
    -- Destination trade info
    destination_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    destination_broker_connection_id UUID REFERENCES broker_connections(id) ON DELETE SET NULL,
    destination_symbol TEXT NOT NULL,
    destination_side TEXT NOT NULL,
    destination_quantity NUMERIC NOT NULL,
    multiplier NUMERIC NOT NULL,
    
    -- Order execution info
    order_id TEXT, -- Broker order ID
    order_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'submitted' | 'filled' | 'rejected' | 'cancelled' | 'error'
    order_type TEXT DEFAULT 'Market', -- 'Market' | 'Limit'
    order_price NUMERIC,
    
    -- Execution details
    filled_quantity NUMERIC,
    filled_price NUMERIC,
    filled_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_user_id ON copy_trade_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_config_id ON copy_trade_logs(copy_trade_config_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_source_account ON copy_trade_logs(source_account_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_destination_account ON copy_trade_logs(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_order_status ON copy_trade_logs(order_status);
CREATE INDEX IF NOT EXISTS idx_copy_trade_logs_created_at ON copy_trade_logs(created_at DESC);

-- Enable RLS
ALTER TABLE copy_trade_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own copy trade logs" ON copy_trade_logs;
CREATE POLICY "Users can view their own copy trade logs" ON copy_trade_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own copy trade logs" ON copy_trade_logs;
CREATE POLICY "Users can insert their own copy trade logs" ON copy_trade_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own copy trade logs" ON copy_trade_logs;
CREATE POLICY "Users can update their own copy trade logs" ON copy_trade_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE copy_trade_logs IS 'Tracks copy trade execution history, including open orders, filled orders, and errors';

