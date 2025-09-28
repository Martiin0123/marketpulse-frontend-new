'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ChartBar,
  Rocket,
  Warning,
  TrendUp,
  TrendDown,
  Calendar,
  CurrencyDollar,
  ChartLine,
  Target,
  Lightning,
  Star
} from '@phosphor-icons/react';
import BalanceCurveChart from './BalanceCurveChart';
import type { TradeEntry } from '@/types/journal';

interface JournalBalanceChartProps {
  accountId: string | null; // null for combined view
  currency: string;
  initialBalance: number;
  className?: string;
  refreshKey?: number;
}

interface BalancePoint {
  date: string;
  balance: number;
  trades: number;
}

export default function JournalBalanceChart({
  accountId,
  currency,
  initialBalance,
  className = '',
  refreshKey = 0
}: JournalBalanceChartProps) {
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    '7d' | '30d' | '90d' | 'all'
  >('30d');
  const [hoveredPoint, setHoveredPoint] = useState<BalancePoint | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Calculate date range based on selected period
        const now = new Date();
        let startDate: Date;

        switch (selectedPeriod) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'all':
            startDate = new Date('2020-01-01'); // Very early date
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .gte('entry_date', startDate.toISOString())
          .order('entry_date', { ascending: true });

        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: tradesData, error: tradesError } = await query;

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          setError(`Database error: ${tradesError.message}`);
          return;
        }

        setTrades(tradesData || []);

        // Calculate balance progression - only create points for days with trades (like share page)
        const balancePoints: BalancePoint[] = [];
        let runningBalance = initialBalance;

        // Add initial point
        balancePoints.push({
          date: startDate.toISOString().split('T')[0],
          balance: runningBalance,
          trades: 0
        });

        // Sort trades by date
        const sortedTrades = (tradesData || []).sort(
          (a, b) =>
            new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
        );

        // Create points only for days with trades
        sortedTrades.forEach((trade) => {
          runningBalance += trade.pnl_amount || 0;
          balancePoints.push({
            date: trade.entry_date.split('T')[0],
            balance: runningBalance,
            trades: 1 // Each trade gets its own point
          });
        });

        setBalanceData(balancePoints);
      } catch (err) {
        console.error('Error in fetchBalanceData:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load balance data'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalanceData();
  }, [accountId, initialBalance, refreshKey, supabase, selectedPeriod]);

  // Convert balance data to chart format
  const chartData = useMemo(() => {
    if (balanceData.length === 0) return [];

    return balanceData.map((point, index) => {
      // Calculate P&L for this point
      let pnl = 0;
      if (index === 0) {
        // First point has no P&L
        pnl = 0;
      } else {
        // P&L is the difference from previous balance
        pnl = point.balance - balanceData[index - 1].balance;
      }

      return {
        date: new Date(point.date),
        balance: point.balance,
        pnl: pnl
      };
    });
  }, [balanceData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (balanceData.length === 0) {
      return {
        totalTrades: 0,
        totalPnL: 0,
        bestDay: 0,
        worstDay: 0,
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        winStreak: 0,
        loseStreak: 0
      };
    }

    const totalTrades = balanceData.reduce(
      (sum, point) => sum + point.trades,
      0
    );
    const totalPnL =
      balanceData[balanceData.length - 1]?.balance - initialBalance || 0;

    // Calculate daily P&L
    const dailyPnL = balanceData.slice(1).map((point, index) => {
      const prevPoint = balanceData[index];
      return point.balance - prevPoint.balance;
    });

    const profitableDays = dailyPnL.filter((pnl) => pnl > 0);
    const losingDays = dailyPnL.filter((pnl) => pnl < 0);

    const bestDay = Math.max(...dailyPnL, 0);
    const worstDay = Math.min(...dailyPnL, 0);
    const averageWin =
      profitableDays.length > 0
        ? profitableDays.reduce((sum, pnl) => sum + pnl, 0) /
          profitableDays.length
        : 0;
    const averageLoss =
      losingDays.length > 0
        ? losingDays.reduce((sum, pnl) => sum + pnl, 0) / losingDays.length
        : 0;

    // Calculate streaks
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let maxWinStreak = 0;
    let maxLoseStreak = 0;

    dailyPnL.forEach((pnl) => {
      if (pnl > 0) {
        currentWinStreak++;
        currentLoseStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (pnl < 0) {
        currentLoseStreak++;
        currentWinStreak = 0;
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
      }
    });

    return {
      totalTrades,
      totalPnL,
      bestDay,
      worstDay,
      averageWin,
      averageLoss,
      maxDrawdown: 0, // TODO: Calculate actual drawdown
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak
    };
  }, [balanceData, initialBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ChartBar className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-slate-400">Loading balance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Warning className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-red-400 mb-2">Error loading data</p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-8 ${className}`}
    >
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>

      {/* Enhanced Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
              <ChartLine className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <Star className="h-2.5 w-2.5 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-green-100 bg-clip-text text-transparent">
              Balance Curve
            </h3>
            <p className="text-slate-400 text-sm flex items-center">
              <Lightning className="h-4 w-4 mr-2 text-yellow-400" />
              Real-time Performance Analytics
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-white mb-2">
            {formatCurrency(
              balanceData[balanceData.length - 1]?.balance || initialBalance
            )}
          </div>
          <div className="text-slate-400 text-sm flex items-center justify-end">
            <CurrencyDollar className="h-4 w-4 mr-1" />
            Current Balance
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center space-x-2 bg-slate-800/50 rounded-2xl p-1 border border-slate-700/50 w-fit">
          {[
            { key: '7d', label: '7D', icon: Calendar },
            { key: '30d', label: '30D', icon: ChartBar },
            { key: '90d', label: '90D', icon: Target },
            { key: 'all', label: 'All', icon: Star }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedPeriod === key
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Chart with Hover Info */}
      <div className="relative z-10 h-[500px] mb-8 group">
        <BalanceCurveChart data={chartData} onHover={setHoveredPoint} />

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
            <div className="text-sm text-slate-300 mb-2">
              {new Date(hoveredPoint.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(hoveredPoint.balance)}
            </div>
            <div className="text-sm text-slate-400">
              {hoveredPoint.trades} trades
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Summary Stats */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ChartBar className="h-6 w-6 text-blue-400" />
            </div>
            <span className="text-slate-400 font-medium">Total Trades</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {stats.totalTrades}
          </div>
          <div className="text-sm text-slate-500">Trades executed</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300"></div>
        </div>

        <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendUp className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-slate-400 font-medium">Best Day</span>
          </div>
          <div className="text-4xl font-bold text-emerald-400 mb-2">
            {formatCurrency(stats.bestDay)}
          </div>
          <div className="text-sm text-slate-500">Peak performance</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
        </div>

        <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-red-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendDown className="h-6 w-6 text-red-400" />
            </div>
            <span className="text-slate-400 font-medium">Worst Day</span>
          </div>
          <div className="text-4xl font-bold text-red-400 mb-2">
            {formatCurrency(stats.worstDay)}
          </div>
          <div className="text-sm text-slate-500">Lowest performance</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/0 to-pink-500/0 group-hover:from-red-500/5 group-hover:to-pink-500/5 transition-all duration-300"></div>
        </div>

        <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Rocket className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-slate-400 font-medium">Win Streak</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {stats.winStreak}
          </div>
          <div className="text-sm text-slate-500">Consecutive wins</div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300"></div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="relative z-10 mt-8 p-6 bg-gradient-to-r from-slate-800/30 to-slate-900/30 rounded-2xl border border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
            <Lightning className="h-5 w-5 text-cyan-400" />
          </div>
          <h4 className="text-lg font-bold text-white">Performance Insights</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-slate-300">
              Win Rate:{' '}
              {stats.totalTrades > 0
                ? Math.round(
                    ((stats.totalTrades - stats.loseStreak) /
                      stats.totalTrades) *
                      100
                  )
                : 0}
              %
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-slate-300">
              Avg Win: {formatCurrency(stats.averageWin)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-slate-300">
              Avg Loss: {formatCurrency(stats.averageLoss)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
