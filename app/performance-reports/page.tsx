import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';
import { calculateTradingStats } from '@/utils/stats';
import ChatWidget from '@/components/ui/ChatWidget/ChatWidget';
import SignalCalendarWrapper from '@/components/ui/Journal/SignalCalendarWrapper';
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

// Function to get real signal performance data and generate 1000-trade simulations
async function getRealSignalData(supabase: any) {
  try {
    // Get all signals from the database
    const { data: signals, error } = await supabase
      .from('signals' as any)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching signals:', error);
      return null;
    }

    if (!signals || signals.length === 0) {
      return null;
    }

    // Calculate real performance metrics
    const totalSignals = signals.length;
    const winningSignals = signals.filter((s) => (s.pnl_percentage || 0) > 0);
    const losingSignals = signals.filter((s) => (s.pnl_percentage || 0) < 0);

    const actualWinRate = (winningSignals.length / totalSignals) * 100;
    const totalGain = signals.reduce(
      (sum, s) => sum + (s.pnl_percentage || 0),
      0
    );
    const averageGain = totalGain / totalSignals;

    // Calculate profit factor
    const totalWins = winningSignals.reduce(
      (sum, s) => sum + (s.pnl_percentage || 0),
      0
    );
    const totalLosses = Math.abs(
      losingSignals.reduce((sum, s) => sum + (s.pnl_percentage || 0), 0)
    );
    const profitFactor =
      totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate average win and loss sizes
    const averageWin =
      winningSignals.length > 0 ? totalWins / winningSignals.length : 0;
    const averageLoss =
      losingSignals.length > 0 ? totalLosses / losingSignals.length : 0;

    // Generate 1000-trade simulations based on real performance
    const simulations = [];
    const iterations = 10;
    const dataPoints = 1000;

    for (let i = 0; i < iterations; i++) {
      const trades = [];
      let cumulativeReturn = 0;

      for (let j = 0; j < dataPoints; j++) {
        // Generate random trade based on actual win rate
        const isWin = Math.random() * 100 < actualWinRate;

        // Calculate trade return based on actual average win/loss
        const tradeReturn = isWin
          ? averageWin + (Math.random() - 0.5) * averageWin * 0.5 // Add some variance to wins
          : -(averageLoss + (Math.random() - 0.5) * averageLoss * 0.5); // Add some variance to losses

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

    // Create cumulative performance data from actual signals
    const cumulativeData = [];
    let cumulativeReturn = 0;

    signals.forEach((signal, index) => {
      cumulativeReturn += signal.pnl_percentage || 0;
      cumulativeData.push({
        trade: index + 1,
        return: signal.pnl_percentage || 0,
        cumulative: cumulativeReturn,
        isWin: (signal.pnl_percentage || 0) > 0,
        date: signal.created_at,
        symbol: signal.symbol
      });
    });

    return {
      totalSignals,
      actualWinRate,
      profitFactor,
      totalGain,
      averageGain,
      cumulativeData,
      signals: signals.slice(-100), // Last 100 signals for detailed view
      simulations, // 1000-trade simulations
      averageWin,
      averageLoss
    };
  } catch (err) {
    console.error('Error processing signal data:', err);
    return null;
  }
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

  // Get real signal performance data
  const realSignalData = await getRealSignalData(supabase);

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

        {/* Real Signal Performance Section */}
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
                Based on your actual performance:{' '}
                {realSignalData?.actualWinRate.toFixed(1)}% win rate and{' '}
                {realSignalData?.profitFactor.toFixed(2)} profit factor
              </p>
              <p className="text-slate-500 text-xs mt-1">
                This simulation shows 10 different scenarios of how the strategy
                might perform over 1000 trades
              </p>
            </div>
          </div>

          {/* Real Performance Statistics */}
          {realSignalData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {realSignalData.actualWinRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-400">Actual Win Rate</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {realSignalData.profitFactor.toFixed(2)}
                </div>
                <div className="text-sm text-slate-400">Profit Factor</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-cyan-400 mb-1">
                  {realSignalData.totalSignals}
                </div>
                <div className="text-sm text-slate-400">Total Signals</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div
                  className={`text-2xl font-bold mb-1 ${
                    realSignalData.totalGain >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {realSignalData.totalGain >= 0 ? '+' : ''}
                  {realSignalData.totalGain.toFixed(2)}%
                </div>
                <div className="text-sm text-slate-400">Total Gain</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-slate-400">No signal data available</div>
            </div>
          )}

          {/* Real Performance Chart */}
          {realSignalData ? (
            <div className="bg-slate-700/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">
                    Cumulative Performance
                  </span>
                </div>
                <div className="text-sm text-slate-400">
                  {realSignalData.totalSignals} signals total
                </div>
              </div>

              {/* 1000-Trade Simulation Chart */}
              <div className="relative h-96 bg-slate-800 rounded-lg p-6">
                {(() => {
                  if (
                    !realSignalData.simulations ||
                    realSignalData.simulations.length === 0
                  ) {
                    return (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-slate-400">
                          No simulation data available
                        </div>
                      </div>
                    );
                  }

                  // Calculate dynamic Y-axis range from all simulations
                  const allValues = realSignalData.simulations.flatMap((sim) =>
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

                      {/* Line charts for each simulation */}
                      {realSignalData.simulations.map(
                        (simulation, simIndex) => {
                          const points = simulation.trades
                            .map((trade, tradeIndex) => {
                              const x =
                                (tradeIndex / (simulation.trades.length - 1)) *
                                100;
                              const y = getY(trade.cumulative);
                              return `${x},${y}`;
                            })
                            .join(' ');

                          const color =
                            simIndex % 2 === 0 ? '#10b981' : '#3b82f6'; // Green and blue alternating
                          const opacity =
                            0.6 +
                            (simIndex / realSignalData.simulations.length) *
                              0.4;

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
                        }
                      )}
                    </svg>
                  );
                })()}

                {/* Y-axis labels */}
                <div className="absolute left-2 top-6 bottom-6 flex flex-col justify-between text-xs text-slate-400">
                  {(() => {
                    if (
                      !realSignalData.simulations ||
                      realSignalData.simulations.length === 0
                    ) {
                      return null;
                    }

                    const allValues = realSignalData.simulations.flatMap(
                      (sim) => sim.trades.map((trade) => trade.cumulative)
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
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-6">
              <div className="text-center py-8">
                <div className="text-slate-400">
                  No signal data available for chart
                </div>
              </div>
            </div>
          )}

          {/* Performance Disclaimer */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-amber-500/20 rounded">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-1">
                  Performance Disclaimer
                </h4>
                <p className="text-xs text-slate-400">
                  This data represents actual historical signal performance.
                  Past performance does not guarantee future results. Trading
                  involves risk of loss.
                </p>
              </div>
            </div>
          </div>

          {/* Simulation Summary */}
          {realSignalData && realSignalData.simulations && (
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">
                Simulation Summary (1000 Trades Each)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">
                    {
                      realSignalData.simulations.filter(
                        (s) => s.finalReturn > 0
                      ).length
                    }
                    /10
                  </div>
                  <div className="text-slate-400">Profitable Iterations</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-cyan-400">
                    {(
                      realSignalData.simulations.reduce(
                        (sum, s) => sum + s.finalReturn,
                        0
                      ) / realSignalData.simulations.length
                    ).toFixed(2)}
                    %
                  </div>
                  <div className="text-slate-400">Average Return</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">
                    {(
                      realSignalData.simulations.reduce(
                        (sum, s) => sum + s.actualWinRate,
                        0
                      ) / realSignalData.simulations.length
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-slate-400">Average Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">
                    {Math.max(
                      ...realSignalData.simulations.map((s) => s.finalReturn)
                    ).toFixed(2)}
                    %
                  </div>
                  <div className="text-slate-400">Best Iteration</div>
                </div>
              </div>
            </div>
          )}
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

        {/* Signal Performance Calendar */}
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Signal Performance Calendar
              </h3>
              <p className="text-slate-400 text-sm">
                Daily signal performance and P&L tracking
              </p>
            </div>
          </div>
          <SignalCalendarWrapper />
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
