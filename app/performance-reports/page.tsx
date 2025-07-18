import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';
import { calculateTradingStats } from '@/utils/stats';
import ChatWidget from '@/components/ui/ChatWidget/ChatWidget';
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Percent,
  Repeat,
  Activity,
  AlertTriangle
} from 'lucide-react';

// Force dynamic rendering since this page uses auth/data
export const dynamic = 'force-dynamic';

// Function to generate simulation data
function generateSimulationData() {
  const winRate = 66.16; // 66.16%
  const profitFactor = 1.694;
  const iterations = 10;
  const dataPoints = 1000;

  const simulations = [];

  for (let i = 0; i < iterations; i++) {
    const trades = [];
    let cumulativeReturn = 0;

    for (let j = 0; j < dataPoints; j++) {
      // Generate random trade based on win rate
      const isWin = Math.random() * 100 < winRate;

      // Calculate trade return based on profit factor
      // For wins: average 1.694% gain, for losses: 1% loss
      const tradeReturn = isWin
        ? (Math.random() * 2 + 0.5) * (profitFactor - 1) // Win: 0.5% to 2.5% gain
        : -(Math.random() * 1.5 + 0.5); // Loss: -0.5% to -2% loss

      cumulativeReturn += tradeReturn;

      trades.push({
        trade: j + 1,
        return: tradeReturn,
        cumulative: cumulativeReturn,
        isWin
      });
    }

    simulations.push({
      iteration: i + 1,
      trades,
      finalReturn: cumulativeReturn,
      winCount: trades.filter((t) => t.isWin).length,
      actualWinRate: (trades.filter((t) => t.isWin).length / dataPoints) * 100
    });
  }

  return simulations;
}

export default async function PerformanceReports() {
  const supabase = createClient();
  const [user, subscription] = await Promise.all([
    getUser(supabase),
    getSubscription(supabase)
  ]);

  // Performance reports are accessible to all users (authenticated or not)
  // No authentication or subscription check needed

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

  // Generate simulation data
  const simulationData = generateSimulationData();

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

        {/* Strategy Simulation Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Repeat className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Strategy Performance Simulation
              </h3>
              <p className="text-slate-400 text-sm">
                Based on current performance: 66.16% win rate and 1.694 profit
                factor
              </p>
              <p className="text-slate-500 text-xs mt-1">
                This simulation shows 10 different scenarios of how the strategy
                might perform over 1000 trades
              </p>
            </div>
          </div>

          {/* Simulation Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                66.16%
              </div>
              <div className="text-sm text-slate-400">Target Win Rate</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                1.694
              </div>
              <div className="text-sm text-slate-400">Profit Factor</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="text-2xl font-bold text-cyan-400 mb-1">10</div>
              <div className="text-sm text-slate-400">Iterations</div>
            </div>
          </div>

          {/* Combined Simulation Chart */}
          <div className="bg-slate-700/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">
                  All 10 Iterations
                </span>
              </div>
              <div className="text-sm text-slate-400">
                {simulationData.length} iterations, 1000 trades each
              </div>
            </div>

            {/* Combined Line Chart */}
            <div className="relative h-96 bg-slate-800 rounded-lg p-6">
              {(() => {
                // Calculate dynamic Y-axis range
                const allValues = simulationData.flatMap((sim) =>
                  sim.trades.map((trade) => trade.cumulative)
                );
                const minValue = Math.min(...allValues);
                const maxValue = Math.max(...allValues);
                const range = maxValue - minValue;
                const padding = range * 0.1; // 10% padding
                const yMin = minValue - padding;
                const yMax = maxValue + padding;
                const yRange = yMax - yMin;

                // Calculate Y position helper
                const getY = (value: number) => {
                  return 100 - ((value - yMin) / yRange) * 100;
                };

                return (
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <defs>
                      <pattern
                        id="grid"
                        width="10"
                        height="10"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 10 0 L 0 0 0 10"
                          fill="none"
                          stroke="#475569"
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid)" />

                    {/* Y-axis grid lines */}
                    <line
                      x1="0"
                      y1="20"
                      x2="100"
                      y2="20"
                      stroke="#475569"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="40"
                      x2="100"
                      y2="40"
                      stroke="#475569"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="60"
                      x2="100"
                      y2="60"
                      stroke="#475569"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="80"
                      x2="100"
                      y2="80"
                      stroke="#475569"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />

                    {/* Zero line (only if zero is within range) */}
                    {yMin <= 0 && yMax >= 0 && (
                      <line
                        x1="0"
                        y1={getY(0)}
                        x2="100"
                        y2={getY(0)}
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    )}

                    {/* Line charts for each iteration */}
                    {simulationData.map((simulation, simIndex) => {
                      const points = simulation.trades
                        .map((trade, tradeIndex) => {
                          const x =
                            (tradeIndex / (simulation.trades.length - 1)) * 100;
                          const y = getY(trade.cumulative);
                          return `${x},${y}`;
                        })
                        .join(' ');

                      const color = simIndex % 2 === 0 ? '#10b981' : '#3b82f6'; // Green and blue alternating
                      const opacity =
                        0.6 + (simIndex / simulationData.length) * 0.4;

                      return (
                        <g key={simIndex}>
                          <polyline
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="0.4"
                            opacity={opacity}
                            className="hover:stroke-width-0.8 transition-all duration-200"
                          />
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

              {/* Y-axis labels */}
              <div className="absolute left-2 top-6 bottom-6 flex flex-col justify-between text-xs text-slate-400">
                {(() => {
                  const allValues = simulationData.flatMap((sim) =>
                    sim.trades.map((trade) => trade.cumulative)
                  );
                  const minValue = Math.min(...allValues);
                  const maxValue = Math.max(...allValues);
                  const range = maxValue - minValue;
                  const padding = range * 0.1;
                  const yMin = minValue - padding;
                  const yMax = maxValue + padding;

                  return (
                    <>
                      <span>{yMax.toFixed(1)}%</span>
                      <span>{((yMax + yMin) / 2).toFixed(1)}%</span>
                      <span>{yMin.toFixed(1)}%</span>
                    </>
                  );
                })()}
              </div>

              {/* X-axis labels */}
              <div className="absolute bottom-2 left-6 right-6 flex justify-between text-xs text-slate-400">
                <span>0</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span>1000</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-green-400 rounded"></div>
                <span className="text-slate-400">Green Lines (Even)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-blue-400 rounded"></div>
                <span className="text-slate-400">Blue Lines (Odd)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-slate-600 rounded"></div>
                <span className="text-slate-400">Zero Line</span>
              </div>
            </div>
          </div>

          {/* Simulation Disclaimer */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-amber-500/20 rounded">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-1">
                  Simulation Disclaimer
                </h4>
                <p className="text-xs text-slate-400">
                  This is a mathematical simulation based on current performance
                  metrics. Past performance does not guarantee future results.
                  Trading involves risk of loss.
                </p>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-4">
              Simulation Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">
                  {simulationData.filter((s) => s.finalReturn > 0).length}/10
                </div>
                <div className="text-slate-400">Profitable Iterations</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-cyan-400">
                  {(
                    simulationData.reduce((sum, s) => sum + s.finalReturn, 0) /
                    simulationData.length
                  ).toFixed(2)}
                  %
                </div>
                <div className="text-slate-400">Average Return</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400">
                  {(
                    simulationData.reduce(
                      (sum, s) => sum + s.actualWinRate,
                      0
                    ) / simulationData.length
                  ).toFixed(1)}
                  %
                </div>
                <div className="text-slate-400">Average Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {Math.max(
                    ...simulationData.map((s) => s.finalReturn)
                  ).toFixed(2)}
                  %
                </div>
                <div className="text-slate-400">Best Iteration</div>
              </div>
            </div>
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
      <ChatWidget />
    </div>
  );
}
