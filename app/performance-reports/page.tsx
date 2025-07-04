import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';

export default async function PerformanceReports() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const subscription = user ? await getSubscription(supabase) : null;

  // Mock performance data - in a real app, this would come from your database
  const performanceData = {
    totalReturn: 156.8,
    monthlyReturn: 12.4,
    winRate: 78.5,
    totalTrades: 342,
    profitableTrades: 268,
    averageTradeReturn: 2.3,
    maxDrawdown: -8.2,
    sharpeRatio: 1.85,
    monthlyReturns: [
      { month: 'Jan', return: 8.2 },
      { month: 'Feb', return: 12.1 },
      { month: 'Mar', return: 6.8 },
      { month: 'Apr', return: 15.3 },
      { month: 'May', return: 9.7 },
      { month: 'Jun', return: 11.2 },
      { month: 'Jul', return: 13.5 },
      { month: 'Aug', return: 7.9 },
      { month: 'Sep', return: 16.1 },
      { month: 'Oct', return: 14.8 },
      { month: 'Nov', return: 18.2 },
      { month: 'Dec', return: 12.4 }
    ]
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
              <span className="text-2xl font-bold text-green-400">
                +{performanceData.totalReturn}%
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
                {performanceData.winRate}%
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
              <span className="text-2xl font-bold text-indigo-400">
                +{performanceData.monthlyReturn}%
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
              {performanceData.monthlyReturns.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{item.month}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{ width: `${Math.max(0, item.return)}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${item.return >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {item.return >= 0 ? '+' : ''}
                      {item.return}%
                    </span>
                  </div>
                </div>
              ))}
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
                  {performanceData.sharpeRatio}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Max Drawdown</span>
                </div>
                <span className="text-lg font-semibold text-red-400">
                  {performanceData.maxDrawdown}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Avg Trade Return</span>
                </div>
                <span className="text-lg font-semibold text-blue-400">
                  +{performanceData.averageTradeReturn}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Profitable Trades</span>
                </div>
                <span className="text-lg font-semibold text-emerald-400">
                  {performanceData.profitableTrades}/
                  {performanceData.totalTrades}
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
              • These performance metrics are based on historical data and may
              not reflect actual trading results.
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
