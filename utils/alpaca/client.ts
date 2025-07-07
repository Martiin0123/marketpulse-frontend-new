const AlpacaClient = require('@alpacahq/alpaca-trade-api');

// Alpaca API configuration
let alpacaClient: any = null;

// Create Alpaca client function to ensure environment variables are loaded
function createAlpacaClient() {
  const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
  const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
  const ALPACA_PAPER = process.env.ALPACA_PAPER === 'true'; // Use paper trading by default

  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error('Alpaca API keys not configured. Please set ALPACA_API_KEY and ALPACA_SECRET_KEY in your environment variables.');
  }
  
  console.log('🔧 Initializing Alpaca client with:', {
    key: `${ALPACA_API_KEY.substring(0, 4)}...${ALPACA_API_KEY.substring(ALPACA_API_KEY.length - 4)}`,
    secret: `${ALPACA_SECRET_KEY.substring(0, 4)}...${ALPACA_SECRET_KEY.substring(ALPACA_SECRET_KEY.length - 4)}`,
    paper: ALPACA_PAPER
  });
  
  return new AlpacaClient({
    key: ALPACA_API_KEY,
    secret: ALPACA_SECRET_KEY,
    paper: ALPACA_PAPER,
    usePolygon: false
  });
}

// Lazy initialization of Alpaca client
function getAlpacaClient() {
  if (!alpacaClient) {
    alpacaClient = createAlpacaClient();
  }
  return alpacaClient;
}

// Types for Alpaca responses
export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  crypto_status?: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  non_marginable_buying_power: string;
  cash: string;
  accrued_fees: string;
  pending_transfer_out: string;
  pending_transfer_in: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at?: string;
  expired_at?: string;
  canceled_at?: string;
  failed_at?: string;
  replaced_at?: string;
  replaced_by?: string;
  replaces?: string;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional?: string;
  qty?: string;
  filled_qty: string;
  filled_avg_price?: string;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price?: string;
  stop_price?: string;
  status: string;
  extended_hours: boolean;
  legs?: AlpacaOrder[];
  trail_percent?: string;
  trail_price?: string;
  hwm?: string;
}

// Account functions
export async function getAccount(): Promise<AlpacaAccount> {
  try {
    const client = getAlpacaClient();
    const account = await client.getAccount();
    return account;
  } catch (error) {
    console.error('Error fetching Alpaca account:', error);
    throw error;
  }
}

// Position functions
export async function getPositions(): Promise<AlpacaPosition[]> {
  try {
    const client = getAlpacaClient();
    const positions = await client.getPositions();
    return positions;
  } catch (error) {
    console.error('Error fetching Alpaca positions:', error);
    throw error;
  }
}

export async function getPosition(symbol: string): Promise<AlpacaPosition | null> {
  try {
    const client = getAlpacaClient();
    const position = await client.getPosition(symbol);
    return position;
  } catch (error) {
    // Position doesn't exist
    return null;
  }
}

// Order functions
export async function submitOrder(orderData: {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  trail_percent?: number;
  trail_price?: number;
}): Promise<AlpacaOrder> {
  try {
    const client = getAlpacaClient();
    const order = await client.createOrder({
      symbol: orderData.symbol,
      qty: orderData.qty.toString(),
      side: orderData.side,
      type: orderData.type,
      time_in_force: orderData.time_in_force,
      limit_price: orderData.limit_price?.toString(),
      stop_price: orderData.stop_price?.toString(),
      trail_percent: orderData.trail_percent?.toString(),
      trail_price: orderData.trail_price?.toString()
    });
    return order;
  } catch (error) {
    console.error('Error submitting Alpaca order:', error);
    throw error;
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  try {
    const client = getAlpacaClient();
    await client.cancelOrder(orderId);
  } catch (error) {
    console.error('Error canceling Alpaca order:', error);
    throw error;
  }
}

export async function getOrder(orderId: string): Promise<AlpacaOrder> {
  try {
    const client = getAlpacaClient();
    const order = await client.getOrder(orderId);
    return order;
  } catch (error) {
    console.error('Error fetching Alpaca order:', error);
    throw error;
  }
}

// Portfolio functions
export async function getPortfolioHistory(startDate: string, endDate: string) {
  try {
    const client = getAlpacaClient();
    const history = await client.getPortfolioHistory({
      date_start: startDate,
      date_end: endDate,
      period: '1D',
      timeframe: '1Day',
      extended_hours: false
    });
    return history;
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    throw error;
  }
}

// Utility functions
export function calculatePnLPercentage(entryPrice: number, currentPrice: number, side: 'buy' | 'sell'): number {
  if (side === 'buy') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

export function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(parseFloat(amount));
}

export function formatPercentage(value: string): string {
  return `${parseFloat(value).toFixed(2)}%`;
} 