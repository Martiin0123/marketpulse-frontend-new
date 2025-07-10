import { createClient } from '@/utils/supabase/server';
import { getSubscription, getSignals } from '@/utils/supabase/queries';
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';

// Helper function to calculate monthly returns from signals
function calculateMonthlyReturns(signals: any[]) {
  const monthlyData: { [key: string]: number } = {};

  // Group signals by month and calculate returns
  signals.forEach((signal) => {
    if (signal.status === 'closed' && signal.pnl_percentage !== null) {
      const date = new Date(signal.exit_timestamp || signal.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += signal.pnl_percentage;
    }
  });

  // Convert to array format and sort by date
  const monthlyReturns = Object.entries(monthlyData)
    .map(([month, returnValue]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', {
        month: 'short'
      }),
      return: returnValue,
      date: month
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return monthlyReturns;
}

// Helper function to calculate max drawdown
function calculateMaxDrawdown(signals: any[]) {
  let peak = 0;
  let maxDrawdown = 0;
  let runningBalance = 100;

  const completedSignals = signals
    .filter(
      (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
    )
    .sort(
      (a, b) =>
        new Date(a.exit_timestamp || a.created_at).getTime() -
        new Date(b.exit_timestamp || b.created_at).getTime()
    );

  completedSignals.forEach((signal) => {
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

  return maxDrawdown;
}

// Helper function to calculate Sharpe ratio (simplified)
function calculateSharpeRatio(signals: any[]) {
  const completedSignals = signals.filter(
    (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
  );

  if (completedSignals.length === 0) return 0;

  const returns = completedSignals.map((signal) => signal.pnl_percentage || 0);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? avgReturn / stdDev : 0;
}

export default async function PerformanceReports() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const subscription = user ? await getSubscription(supabase) : null;
  const signals = await getSignals(supabase);

  // Calculate real performance metrics from signals
  const completedTrades = signals.filter(
    (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
  );

  const totalTrades = signals.length;
  const profitableTrades = completedTrades.filter(
    (signal) => (signal.pnl_percentage || 0) > 0
  ).length;
  const winRate =
    completedTrades.length > 0
      ? (profitableTrades / completedTrades.length) * 100
      : 0;

  const totalReturn = completedTrades.reduce(
    (sum, signal) => sum + (signal.pnl_percentage || 0),
    0
  );
  const averageTradeReturn =
    completedTrades.length > 0 ? totalReturn / completedTrades.length : 0;

  const monthlyReturns = calculateMonthlyReturns(signals);
  const maxDrawdown = calculateMaxDrawdown(signals);
  const sharpeRatio = calculateSharpeRatio(signals);

  // Calculate average monthly return
  const averageMonthlyReturn =
    monthlyReturns.length > 0
      ? monthlyReturns.reduce((sum, month) => sum + month.return, 0) /
        monthlyReturns.length
      : 0;

  const performanceData = {
    totalReturn,
    monthlyReturn: averageMonthlyReturn,
    winRate,
    totalTrades,
    profitableTrades,
    averageTradeReturn,
    maxDrawdown,
    sharpeRatio,
    monthlyReturns
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="pt-20 pb-12 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Performance Reports
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Transparent, detailed performance metrics showing our trading
              signal accuracy and returns
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <span
                className={`text-2xl font-bold ${performanceData.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {performanceData.totalReturn >= 0 ? '+' : ''}
                {performanceData.totalReturn.toFixed(2)}%
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Total Return</h3>
            <p className="text-slate-400 text-sm">Since inception</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-emerald-400">
                {performanceData.winRate.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Win Rate</h3>
            <p className="text-slate-400 text-sm">Profitable trades</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-2xl font-bold text-cyan-400">
                {performanceData.totalTrades}
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Total Trades</h3>
            <p className="text-slate-400 text-sm">Signals generated</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-indigo-400" />
              </div>
              <span
                className={`text-2xl font-bold ${performanceData.monthlyReturn >= 0 ? 'text-indigo-400' : 'text-red-400'}`}
              >
                {performanceData.monthlyReturn >= 0 ? '+' : ''}
                {performanceData.monthlyReturn.toFixed(2)}%
              </span>
            </div>
            <h3 className="text-slate-300 font-medium">Monthly Return</h3>
            <p className="text-slate-400 text-sm">Average monthly</p>
          </div>
        </div>

        {/* Detailed Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Monthly Performance Chart */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">
              Monthly Performance
            </h3>
            <div className="space-y-4">
              {performanceData.monthlyReturns.length > 0 ? (
                performanceData.monthlyReturns.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{item.month}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(item.return, 100))}%`
                          }}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${item.return >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {item.return >= 0 ? '+' : ''}
                        {item.return.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    No monthly data available yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6">
              Risk Metrics
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Percent className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Sharpe Ratio</span>
                </div>
                <span className="text-lg font-semibold text-green-400">
                  {performanceData.sharpeRatio.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Max Drawdown</span>
                </div>
                <span className="text-lg font-semibold text-red-400">
                  {performanceData.maxDrawdown.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Avg Trade Return</span>
                </div>
                <span
                  className={`text-lg font-semibold ${performanceData.averageTradeReturn >= 0 ? 'text-blue-400' : 'text-red-400'}`}
                >
                  {performanceData.averageTradeReturn >= 0 ? '+' : ''}
                  {performanceData.averageTradeReturn.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Profitable Trades</span>
                </div>
                <span className="text-lg font-semibold text-emerald-400">
                  {performanceData.profitableTrades}/{completedTrades.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Important Disclaimers
          </h3>
          <div className="space-y-3 text-slate-400 text-sm">
            <p>
              • Past performance does not guarantee future results. Trading
              involves substantial risk of loss.
            </p>
            <p>
              • These performance metrics are based on actual trading signals
              and historical data.
            </p>
            <p>
              • Individual results may vary based on market conditions, timing,
              and risk management.
            </p>
            <p>
              • Always conduct your own research and consider consulting with a
              financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
