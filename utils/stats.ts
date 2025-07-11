import { createClient } from '@/utils/supabase/server';

export interface TradingStats {
  // Basic counts
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  profitableTrades: number;
  losingTrades: number;

  // Performance metrics
  totalPnl: number;
  thisMonthPnl: number;
  winRate: number;
  averageTradeReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;

  // Monthly data
  monthlyReturns: Array<{
    month: string;
    return: number;
    date: string;
  }>;
  thisMonthSignals: number;
  thisMonthProfitable: number;

  // Raw data
  signals: any[];
  completedTrades: any[];
}

 

export async function calculateTradingStats() {
  try {
    const supabase = createClient();

    // Fetch all signals
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false });

    if (signalsError) {
      console.error('Error fetching signals:', signalsError);
      throw new Error('Failed to fetch signals');
    }

    const signalsData = signals || [];
    console.log('🔍 Stats: Raw signals from database:', {
      totalSignals: signalsData.length,
      signalsCount: signalsData.filter(s => s.status === 'closed' && s.pnl_percentage !== null).length
    });

    // Calculate all statistics
    const completedTrades = signalsData.filter(
      (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
    );

    const totalSignals = signalsData.length;
    const activeSignals = signalsData.filter(
      (signal) => signal.status === 'active'
    ).length;
    const closedSignals = completedTrades.length;

    const profitableTrades = completedTrades.filter(
      (signal) => (signal.pnl_percentage || 0) > 0
    ).length;

    const totalPnl = completedTrades.reduce(
      (sum, signal) => sum + (signal.pnl_percentage || 0),
      0
    );

    const winRate = closedSignals > 0 ? (profitableTrades / closedSignals) * 100 : 0;
    const averageTradeReturn = closedSignals > 0 ? totalPnl / closedSignals : 0;

    console.log('🔍 Stats: Calculated statistics:', {
      totalSignals,
      activeSignals,
      closedSignals,
      profitableTrades,
      totalPnl,
      winRate,
      averageTradeReturn,
      completedTrades: completedTrades.map(t => ({
        pnl_percentage: t.pnl_percentage,
        status: t.status
      }))
    });

    // Calculate this month's performance
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const thisMonthSignals = signalsData.filter((signal) => {
      const signalDate = new Date(signal.created_at);
      return (
        signalDate.getMonth() === currentMonth &&
        signalDate.getFullYear() === currentYear &&
        signal.status === 'closed' &&
        signal.pnl_percentage !== null
      );
    });

    const thisMonthPnl = thisMonthSignals.reduce(
      (sum, signal) => sum + (signal.pnl_percentage || 0),
      0
    );

    console.log('🔍 Stats: This month data:', {
      currentMonth,
      currentYear,
      thisMonthSignals: thisMonthSignals.length,
      thisMonthPnl,
      thisMonthSignalsData: thisMonthSignals.map(s => ({
        pnl_percentage: s.pnl_percentage,
        created_at: s.created_at
      }))
    });

    // Calculate monthly returns for performance reports
    const monthlyData: { [key: string]: number } = {};
    signalsData.forEach((signal) => {
      if (signal.status === 'closed' && signal.pnl_percentage !== null) {
        const date = new Date(signal.exit_timestamp || signal.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += signal.pnl_percentage;
      }
    });

    const monthlyReturns = Object.entries(monthlyData)
      .map(([month, returnValue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short'
        }),
        return: returnValue,
        date: month
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('🔍 Stats: Monthly returns:', monthlyReturns);

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningBalance = 100;

    const sortedCompletedSignals = completedTrades.sort(
      (a, b) =>
        new Date(a.exit_timestamp || a.created_at).getTime() -
        new Date(b.exit_timestamp || b.created_at).getTime()
    );

    sortedCompletedSignals.forEach((signal) => {
      const pnl = signal.pnl_percentage || 0;
      runningBalance *= 1 + pnl / 100;

      if (runningBalance > peak) {
        peak = runningBalance;
      }

      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Calculate Sharpe ratio
    let sharpeRatio = 0;
    if (completedTrades.length > 0) {
      const returns = completedTrades.map((signal) => signal.pnl_percentage || 0);
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance =
        returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
        returns.length;
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }

    const stats = {
      // Basic counts
      totalSignals,
      activeSignals,
      closedSignals,
      profitableTrades,
      losingTrades: closedSignals - profitableTrades,

      // Performance metrics
      totalPnl,
      thisMonthPnl,
      winRate,
      averageTradeReturn,
      maxDrawdown,
      sharpeRatio,

      // Monthly data
      monthlyReturns,
      thisMonthSignals: thisMonthSignals.length,
      thisMonthProfitable: thisMonthSignals.filter(
        (signal) => (signal.pnl_percentage || 0) > 0
      ).length,

      // Raw data
      signals: signalsData,
      completedTrades
    };

    console.log('🔍 Stats: Final stats object:', {
      totalSignals: stats.totalSignals,
      totalPnl: stats.totalPnl,
      profitableTrades: stats.profitableTrades,
      closedSignals: stats.closedSignals,
      thisMonthPnl: stats.thisMonthPnl
    });

    return stats;
  } catch (error) {
    console.error('Error calculating trading stats:', error);
    throw error;
  }
} 