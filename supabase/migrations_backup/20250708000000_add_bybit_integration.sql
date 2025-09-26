-- Add Bybit integration support
-- This migration adds exchange field to track which exchange (alpaca/bybit) is used

-- Add exchange column to signals table
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS exchange VARCHAR(20) DEFAULT 'alpaca';

-- Add exchange column to positions table  
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS exchange VARCHAR(20) DEFAULT 'alpaca';

-- Create indexes for better performance with exchange filtering
CREATE INDEX IF NOT EXISTS idx_signals_exchange ON public.signals(exchange);
CREATE INDEX IF NOT EXISTS idx_positions_exchange ON public.positions(exchange);
CREATE INDEX IF NOT EXISTS idx_signals_exchange_symbol ON public.signals(exchange, symbol);
CREATE INDEX IF NOT EXISTS idx_positions_exchange_symbol ON public.positions(exchange, symbol);

-- Update existing records to have alpaca as default exchange
UPDATE public.signals SET exchange = 'alpaca' WHERE exchange IS NULL;
UPDATE public.positions SET exchange = 'alpaca' WHERE exchange IS NULL;

-- Create a view for multi-exchange signal performance analysis
CREATE OR REPLACE VIEW public.multi_exchange_signal_performance AS
SELECT 
    s.id as signal_id,
    s.symbol,
    s.type as signal_type,
    s.entry_price,
    s.exit_price,
    s.pnl_percentage,
    s.status,
    s.exchange,
    s.created_at as signal_created,
    s.exit_timestamp as signal_exited,
    s.strategy_name,
    s.timeframe,
    s.rsi_value,
    s.smoothing_ma_value,
    s.long_term_ma_value,
    s.divergence_type,
    s.exit_reason,
    p.id as position_id,
    p.status as position_status,
    p.entry_timestamp as position_entry,
    p.exit_timestamp as position_exit,
    p.pnl as position_pnl
FROM public.signals s
LEFT JOIN public.positions p ON s.id = p.signal_id
ORDER BY s.created_at DESC;

-- Create a function to calculate signal statistics by exchange
CREATE OR REPLACE FUNCTION public.calculate_exchange_signal_stats(
    p_exchange VARCHAR DEFAULT NULL,
    p_strategy_name VARCHAR DEFAULT 'Primescope Crypto',
    p_timeframe VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    exchange VARCHAR,
    total_signals BIGINT,
    winning_signals BIGINT,
    losing_signals BIGINT,
    win_rate DECIMAL(5,2),
    avg_profit DECIMAL(10,4),
    avg_loss DECIMAL(10,4),
    profit_factor DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    total_pnl DECIMAL(10,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.exchange,
        COUNT(*) as total_signals,
        COUNT(CASE WHEN s.pnl_percentage > 0 THEN 1 END) as winning_signals,
        COUNT(CASE WHEN s.pnl_percentage < 0 THEN 1 END) as losing_signals,
        ROUND(
            (COUNT(CASE WHEN s.pnl_percentage > 0 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
        ) as win_rate,
        AVG(CASE WHEN s.pnl_percentage > 0 THEN s.pnl_percentage END) as avg_profit,
        AVG(CASE WHEN s.pnl_percentage < 0 THEN s.pnl_percentage END) as avg_loss,
        CASE 
            WHEN AVG(CASE WHEN s.pnl_percentage < 0 THEN ABS(s.pnl_percentage) END) = 0 THEN 0
            ELSE AVG(CASE WHEN s.pnl_percentage > 0 THEN s.pnl_percentage END) / AVG(CASE WHEN s.pnl_percentage < 0 THEN ABS(s.pnl_percentage) END)
        END as profit_factor,
        MIN(s.pnl_percentage) as max_drawdown,
        SUM(s.pnl_percentage) as total_pnl
    FROM public.signals s
    WHERE s.status = 'closed'
        AND (p_exchange IS NULL OR s.exchange = p_exchange)
        AND (p_strategy_name IS NULL OR s.strategy_name = p_strategy_name)
        AND (p_timeframe IS NULL OR s.timeframe = p_timeframe)
        AND (p_start_date IS NULL OR s.created_at >= p_start_date)
        AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    GROUP BY s.exchange
    ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get active positions by exchange
CREATE OR REPLACE FUNCTION public.get_active_positions_by_exchange(
    p_exchange VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    symbol VARCHAR,
    type VARCHAR,
    entry_price DECIMAL,
    entry_timestamp TIMESTAMPTZ,
    quantity DECIMAL,
    status VARCHAR,
    exchange VARCHAR,
    strategy_name VARCHAR,
    pnl DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.symbol,
        p.type,
        p.entry_price,
        p.entry_timestamp,
        p.quantity,
        p.status,
        p.exchange,
        p.strategy_name,
        p.pnl
    FROM public.positions p
    WHERE p.status = 'open'
        AND (p_exchange IS NULL OR p.exchange = p_exchange)
    ORDER BY p.entry_timestamp DESC;
END;
$$ LANGUAGE plpgsql; 