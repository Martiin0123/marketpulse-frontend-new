-- Add is_fifth_trade flag to signals table
ALTER TABLE public.signals
ADD COLUMN IF NOT EXISTS is_fifth_trade BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_signals_is_fifth_trade ON public.signals(is_fifth_trade);

-- Add comment for documentation
COMMENT ON COLUMN public.signals.is_fifth_trade IS 'Flag to indicate if this signal is a 5th trade (for free webhook)';
