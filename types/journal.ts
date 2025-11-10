export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  initial_balance: number;
  fixed_risk?: number; // Deprecated, use risk_per_r instead
  risk_per_r?: number; // Dollar amount that equals 1R
  created_at: string;
  updated_at: string;
}

export interface AccountStats {
  totalTrades: number;
  winRate: number;
  averageRR: number;
  totalRR: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  winStreak: number;
  loseStreak: number;
  totalPnL: number;
  totalOpportunityCost: number;
  expectedValue: number;
  sharpeRatio: number;
  bestTPRR: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  rr: number;
  wins: number;
  losses: number;
}

export interface ExitLevel {
  tp: number; // Exit level number (1, 2, 3, etc.) - can be profit or loss
  qty: number; // Quantity closed at this level
  price: number; // Exit price at this level
  pnl: number; // PnL at this level (can be positive or negative)
  timestamp?: string; // Timestamp of this exit
}

export interface TradeEntry {
  id: string;
  account_id: string;
  user_id?: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  pnl_percentage: number;
  pnl_amount: number;
  rr: number;
  max_adverse?: number;
  risk_multiplier?: number;
  status: 'open' | 'closed';
  entry_date: string;
  exit_date?: string;
  notes?: string;
  balance?: number;
  image_url?: string;
  image_data?: string;
  exit_levels?: ExitLevel[]; // Array of exit levels for trades with multiple partial exits
  size?: number; // Trade size/quantity
  broker_trade_id?: string; // For synced trades or copied trades
  sync_source?: string; // Source of the trade (e.g., 'projectx', 'tradovate', 'copy_trade')
  created_at: string;
  updated_at: string;
}
