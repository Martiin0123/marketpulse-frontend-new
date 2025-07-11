import { calculateTradingStats } from '@/utils/stats';
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';

export default async function PerformanceReports() {
  // Calculate trading stats directly
  const tradingStats = await calculateTradingStats();

  if (!tradingStats) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Error Loading Reports
          </h1>
          <p className="text-slate-400">Unable to load performance data.</p>
        </div>
      </div>
    );
  }

  const performanceData = {
    totalReturn: tradingStats.totalPnl,
    monthlyReturn:
      tradingStats.monthlyReturns.length > 0
        ? tradingStats.monthlyReturns.reduce(
            (sum: number, month: any) => sum + month.return,
            0
          ) / tradingStats.monthlyReturns.length
        : 0,
    winRate: tradingStats.winRate,
    totalTrades: tradingStats.totalSignals,
    activeTrades: tradingStats.activeSignals,
    profitableTrades: tradingStats.profitableTrades,
    completedTrades: tradingStats.closedSignals,
    averageTradeReturn: tradingStats.averageTradeReturn,
    maxDrawdown: tradingStats.maxDrawdown,
    sharpeRatio: tradingStats.sharpeRatio,
    monthlyReturns: tradingStats.monthlyReturns
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
            <h3 className="text-slate-300 font-medium">Total Signals</h3>
            <p className="text-slate-400 text-sm">All signals generated</p>
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
                performanceData.monthlyReturns.map(
                  (item: any, index: number) => (
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
                              width: `${Math.max(0, Math.min(Math.abs(item.return), 100))}%`
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
                  )
                )
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
                  <span className="text-slate-300">Completed Trades</span>
                </div>
                <span className="text-lg font-semibold text-emerald-400">
                  {performanceData.completedTrades}/
                  {performanceData.totalTrades}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Active Signals</span>
                </div>
                <span className="text-lg font-semibold text-yellow-400">
                  {performanceData.activeTrades}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Statistics */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-12">
          <h3 className="text-xl font-semibold text-white mb-6">
            Trade Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">
                {performanceData.profitableTrades}
              </div>
              <div className="text-slate-400 text-sm">Winning Trades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {performanceData.completedTrades -
                  performanceData.profitableTrades}
              </div>
              <div className="text-slate-400 text-sm">Losing Trades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {performanceData.completedTrades}
              </div>
              <div className="text-slate-400 text-sm">Total Completed</div>
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
              and historical data from closed trades only.
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
