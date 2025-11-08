export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  initial_balance: number;
  fixed_risk: number;
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

export interface TradeEntry {
  id: string;
  account_id: string;
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
  created_at: string;
  updated_at: string;
}
