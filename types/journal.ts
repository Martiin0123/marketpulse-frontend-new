export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  initial_balance: number;
  currency: string;
  risk_per_trade: number;
  created_at: string;
  updated_at: string;
}

export interface TradeEntry {
  id: string;
  account_id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  date: string;
  time: string;
  timeframe: string;
  status: string;
  rrAchieved: number;
  maxRR: number;
  maxAdverse: string;
  notes?: string;
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
}

export interface DailyStats {
  date: string;
  trades: number;
  rr: number;
  wins: number;
  losses: number;
}
