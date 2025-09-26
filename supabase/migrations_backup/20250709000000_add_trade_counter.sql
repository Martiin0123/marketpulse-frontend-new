-- Add trade counter table for Discord webhook management
-- This migration adds a table to track trade counts for sending every 5th trade to free webhook

-- Create trade counter table
CREATE TABLE IF NOT EXISTS public.trade_counter (
    id INTEGER PRIMARY KEY DEFAULT 1,
    counter BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial record
INSERT INTO public.trade_counter (id, counter) 
VALUES (1, 0) 
ON CONFLICT (id) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trade_counter_id ON public.trade_counter(id);

-- Add comments for documentation
COMMENT ON TABLE public.trade_counter IS 'Tracks trade count for Discord webhook management';
COMMENT ON COLUMN public.trade_counter.counter IS 'Current trade count (every 5th trade sent to free webhook)';
COMMENT ON COLUMN public.trade_counter.updated_at IS 'Last time the counter was updated';

-- Create a function to get and increment trade counter
CREATE OR REPLACE FUNCTION public.get_and_increment_trade_counter()
RETURNS BIGINT AS $$
DECLARE
    current_counter BIGINT;
BEGIN
    -- Get current counter
    SELECT counter INTO current_counter 
    FROM public.trade_counter 
    WHERE id = 1;
    
    -- Increment counter
    UPDATE public.trade_counter 
    SET counter = counter + 1, updated_at = NOW() 
    WHERE id = 1;
    
    RETURN COALESCE(current_counter, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if this is every 5th trade
CREATE OR REPLACE FUNCTION public.is_every_fifth_trade()
RETURNS BOOLEAN AS $$
DECLARE
    current_counter BIGINT;
BEGIN
    SELECT counter INTO current_counter 
    FROM public.trade_counter 
    WHERE id = 1;
    
    RETURN (COALESCE(current_counter, 0) % 5) = 0;
END;
$$ LANGUAGE plpgsql; 