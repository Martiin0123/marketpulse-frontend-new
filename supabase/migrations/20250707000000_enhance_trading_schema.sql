-- Enhance trading schema for Pine Script strategy
-- This migration adds new columns and improves the existing schema

-- Add new columns to signals table for Pine Script strategy
ALTER TABLE public.signals 
ADD COLUMN IF NOT EXISTS signal_source VARCHAR(50) DEFAULT 'pinescript',
ADD COLUMN IF NOT EXISTS strategy_name VARCHAR(100) DEFAULT 'Primescope Crypto',
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20),
ADD COLUMN IF NOT EXISTS rsi_value DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS smoothing_ma_value DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS long_term_ma_value DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS divergence_type VARCHAR(20), -- 'bull', 'bear', null
ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(100), -- 'ma_cross', 'trailing_stop', 'hard_stop', 'manual'
ADD COLUMN IF NOT EXISTS exit_price DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS exit_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pnl_percentage DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'cancelled'
ADD COLUMN IF NOT EXISTS alert_message TEXT,
ADD COLUMN IF NOT EXISTS technical_metadata JSONB;

-- Add new columns to positions table for better tracking
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS signal_id UUID REFERENCES public.signals(id),
ADD COLUMN IF NOT EXISTS strategy_name VARCHAR(100) DEFAULT 'Primescope Crypto',
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20),
ADD COLUMN IF NOT EXISTS entry_reason VARCHAR(100), -- 'rsi_ma_cross', 'divergence', 'manual'
ADD COLUMN IF NOT EXISTS exit_reason VARCHAR(100), -- 'ma_cross', 'trailing_stop', 'hard_stop', 'manual'
ADD COLUMN IF NOT EXISTS trailing_stop_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trailing_stop_price DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS hard_stop_price DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS take_profit_price DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS atr_value DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS technical_metadata JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signals_symbol_created ON public.signals(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_strategy ON public.signals(strategy_name);
CREATE INDEX IF NOT EXISTS idx_positions_signal_id ON public.positions(signal_id);
CREATE INDEX IF NOT EXISTS idx_positions_strategy ON public.positions(strategy_name);
CREATE INDEX IF NOT EXISTS idx_positions_status_symbol ON public.positions(status, symbol);

-- Create a view for signal performance analysis
CREATE OR REPLACE VIEW public.signal_performance AS
SELECT 
    s.id as signal_id,
    s.symbol,
    s.type as signal_type,
    s.entry_price,
    s.exit_price,
    s.pnl_percentage,
    s.status,
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

-- Create a function to calculate signal statistics
CREATE OR REPLACE FUNCTION public.calculate_signal_stats(
    p_strategy_name VARCHAR DEFAULT 'Primescope Crypto',
    p_timeframe VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
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
    WITH signal_stats AS (
        SELECT 
            COUNT(*) as total_signals,
            COUNT(CASE WHEN pnl_percentage > 0 THEN 1 END) as winning_signals,
            COUNT(CASE WHEN pnl_percentage < 0 THEN 1 END) as losing_signals,
            AVG(CASE WHEN pnl_percentage > 0 THEN pnl_percentage END) as avg_profit,
            AVG(CASE WHEN pnl_percentage < 0 THEN pnl_percentage END) as avg_loss,
            SUM(pnl_percentage) as total_pnl
        FROM public.signals s
        WHERE s.status = 'closed'
            AND s.strategy_name = p_strategy_name
            AND (p_timeframe IS NULL OR s.timeframe = p_timeframe)
            AND (p_start_date IS NULL OR s.created_at >= p_start_date)
            AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    )
    SELECT 
        ss.total_signals,
        ss.winning_signals,
        ss.losing_signals,
        CASE 
            WHEN ss.total_signals > 0 
            THEN (ss.winning_signals::DECIMAL / ss.total_signals::DECIMAL) * 100
            ELSE 0 
        END as win_rate,
        COALESCE(ss.avg_profit, 0) as avg_profit,
        COALESCE(ss.avg_loss, 0) as avg_loss,
        CASE 
            WHEN ABS(COALESCE(ss.avg_loss, 0)) > 0 
            THEN ABS(COALESCE(ss.avg_profit, 0) / COALESCE(ss.avg_loss, 0))
            ELSE 0 
        END as profit_factor,
        0 as max_drawdown, -- TODO: Implement drawdown calculation
        COALESCE(ss.total_pnl, 0) as total_pnl
    FROM signal_stats ss;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.signals IS 'Trading signals generated by Pine Script strategies';
COMMENT ON COLUMN public.signals.signal_source IS 'Source of the signal (pinescript, manual, etc.)';
COMMENT ON COLUMN public.signals.strategy_name IS 'Name of the Pine Script strategy';
COMMENT ON COLUMN public.signals.timeframe IS 'Trading timeframe (1m, 5m, 1h, etc.)';
COMMENT ON COLUMN public.signals.rsi_value IS 'RSI value at signal generation';
COMMENT ON COLUMN public.signals.smoothing_ma_value IS 'Smoothing MA value at signal generation';
COMMENT ON COLUMN public.signals.long_term_ma_value IS 'Long-term MA value at signal generation';
COMMENT ON COLUMN public.signals.divergence_type IS 'Type of divergence detected (bull, bear, null)';
COMMENT ON COLUMN public.signals.exit_reason IS 'Reason for signal exit';
COMMENT ON COLUMN public.signals.technical_metadata IS 'Additional technical indicators and metadata';

COMMENT ON TABLE public.positions IS 'Trading positions linked to signals';
COMMENT ON COLUMN public.positions.signal_id IS 'Reference to the signal that triggered this position';
COMMENT ON COLUMN public.positions.strategy_name IS 'Name of the strategy used';
COMMENT ON COLUMN public.positions.entry_reason IS 'Reason for position entry';
COMMENT ON COLUMN public.positions.exit_reason IS 'Reason for position exit';
COMMENT ON COLUMN public.positions.trailing_stop_activated IS 'Whether trailing stop was activated';
COMMENT ON COLUMN public.positions.trailing_stop_price IS 'Trailing stop price level';
COMMENT ON COLUMN public.positions.hard_stop_price IS 'Hard stop loss price level';
COMMENT ON COLUMN public.positions.take_profit_price IS 'Take profit price level';
COMMENT ON COLUMN public.positions.atr_value IS 'ATR value at position entry';
COMMENT ON COLUMN public.positions.technical_metadata IS 'Additional technical data for the position'; 