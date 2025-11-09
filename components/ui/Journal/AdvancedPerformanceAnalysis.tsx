'use client';

import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ChartBarIcon,
  ClockIcon,
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FireIcon,
  StarIcon,
  TrophyIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import type { TradeEntry } from '@/types/journal';

// Type guard to ensure icons are valid React components
const isValidIcon = (
  icon: any
): icon is React.ComponentType<{ className?: string }> => {
  return (
    typeof icon === 'function' || (typeof icon === 'object' && icon !== null)
  );
};

interface AdvancedPerformanceAnalysisProps {
  accountId: string | null;
  className?: string;
  refreshKey?: number;
}

interface MonthlyStats {
  month: string;
  year: number;
  monthNumber: number;
  trades: number;
  totalRR: number;
  totalPnL: number;
  winRate: number;
  wins: number;
  losses: number;
  averageRR: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

interface TradeDurationStats {
  duration: string;
  trades: number;
  totalRR: number;
  winRate: number;
}

interface WinLossDistribution {
  range: string;
  count: number;
  totalRR: number;
}

export default function AdvancedPerformanceAnalysis({
  accountId,
  className = '',
  refreshKey = 0
}: AdvancedPerformanceAnalysisProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'monthly' | 'duration' | 'distribution' | 'risk'
  >('overview');

  const supabase = createClient();

  useEffect(() => {
    fetchTrades();
  }, [accountId, refreshKey]);

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('status', 'closed')
        .order('entry_date', { ascending: true });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching trades:', fetchError);
        setError('Failed to load trades');
        return;
      }

      setTrades((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate comprehensive overview stats
  const overviewStats = useMemo(() => {
    if (trades.length === 0) return null;

    const wins = trades.filter(
      (t) => (t.rr && t.rr > 0) || (t.pnl_amount && t.pnl_amount > 0)
    );
    const losses = trades.filter(
      (t) => (t.rr && t.rr < 0) || (t.pnl_amount && t.pnl_amount < 0)
    );

    const totalRR = trades.reduce((sum, t) => sum + (t.rr || 0), 0);
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
    const averageRR = totalRR / trades.length;

    const winRR = wins.reduce((sum, t) => sum + (t.rr || 0), 0);
    const lossRR = Math.abs(losses.reduce((sum, t) => sum + (t.rr || 0), 0));
    const profitFactor = lossRR > 0 ? winRR / lossRR : winRR > 0 ? 999 : 0;

    const averageWin = wins.length > 0 ? winRR / wins.length : 0;
    const averageLoss = losses.length > 0 ? lossRR / losses.length : 0;

    // Calculate expectancy
    const winRate = (wins.length / trades.length) * 100;
    const expectancy =
      (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss;

    // Calculate Sharpe Ratio
    const rrValues = trades.map((t) => t.rr || 0);
    const mean = averageRR;
    const variance =
      rrValues.reduce((sum, rr) => sum + Math.pow(rr - mean, 2), 0) /
      rrValues.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? mean / stdDev : 0;

    // Calculate max drawdown
    // Drawdown is the decline from a peak to a trough
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;

    trades.forEach((trade) => {
      runningTotal += trade.rr || 0;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      // Drawdown is the amount lost from the peak (always positive)
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Recovery Factor = Total Profit / Max Drawdown
    // Only calculate if we have profit and drawdown
    const recoveryFactor =
      maxDrawdown > 0 && totalRR > 0
        ? totalRR / maxDrawdown
        : totalRR > 0 && maxDrawdown === 0
          ? 999
          : 0;

    // Calculate average trade duration
    const durations = trades
      .filter((t) => t.entry_date && t.exit_date)
      .map((t) => {
        const entry = new Date(t.entry_date);
        const exit = new Date(t.exit_date);
        return exit.getTime() - entry.getTime();
      });
    const avgDurationMs =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
    const avgDurationHours = avgDurationMs / (1000 * 60 * 60);
    const avgDurationDays = avgDurationMs / (1000 * 60 * 60 * 24);

    // Calculate trade frequency
    let tradesPerDay = 0;
    let tradesPerWeek = 0;
    let tradesPerMonth = 0;
    if (trades.length > 0) {
      const firstTrade = new Date(trades[0].entry_date);
      const lastTrade = new Date(trades[trades.length - 1].entry_date);
      const daysDiff =
        (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24);
      tradesPerDay = daysDiff > 0 ? trades.length / daysDiff : 0;
      tradesPerWeek = tradesPerDay * 7;
      tradesPerMonth = tradesPerDay * 30;
    }

    // Calculate consecutive wins/losses
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach((trade) => {
      const isWin =
        (trade.rr && trade.rr > 0) ||
        (trade.pnl_amount && trade.pnl_amount > 0);
      if (isWin) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    });

    // Best and worst trades
    const bestTrade = Math.max(...trades.map((t) => t.rr || t.pnl_amount || 0));
    const worstTrade = Math.min(
      ...trades.map((t) => t.rr || t.pnl_amount || 0)
    );

    // Calculate Kelly Criterion
    const winProb = winRate / 100;
    const avgWin = averageWin;
    const avgLoss = averageLoss;
    const kellyPercent =
      avgLoss !== 0
        ? winProb - (1 - winProb) / (avgWin / Math.abs(avgLoss))
        : 0;

    // Risk of Ruin
    // More accurate calculation based on win rate, profit factor, and account size
    const riskOfRuin = (() => {
      // If losing money or break-even, risk of ruin is high
      if (totalRR <= 0 || profitFactor <= 1) return 100;

      // If win rate is too low, risk is high
      if (winRate <= 50) return 100;

      // Calculate edge (expected value per trade)
      const winProb = winRate / 100;
      const lossProb = 1 - winProb;
      const edge = winProb * averageWin - lossProb * averageLoss;

      // If negative edge, ruin is certain
      if (edge <= 0) return 100;

      // Simplified risk of ruin: based on probability of consecutive losses
      // This is a conservative estimate
      const maxConsecutiveLosses = Math.ceil(
        Math.abs(maxDrawdown) / Math.abs(averageLoss)
      );
      if (maxConsecutiveLosses <= 0 || averageLoss === 0) return 0;

      // Probability of hitting max consecutive losses
      const ruinProbability = Math.pow(lossProb, maxConsecutiveLosses) * 100;

      return Math.min(100, Math.max(0, ruinProbability));
    })();

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalRR,
      totalPnL,
      averageRR,
      profitFactor,
      averageWin,
      averageLoss,
      expectancy,
      sharpeRatio,
      maxDrawdown,
      recoveryFactor,
      avgDurationHours,
      avgDurationDays,
      maxWinStreak,
      maxLossStreak,
      bestTrade,
      worstTrade,
      kellyPercent,
      riskOfRuin,
      tradesPerDay,
      tradesPerWeek,
      tradesPerMonth
    };
  }, [trades]);

  // Calculate monthly statistics
  const monthlyStats = useMemo(() => {
    const monthMap = new Map<string, MonthlyStats>();

    trades.forEach((trade) => {
      const date = new Date(trade.entry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          monthNumber: date.getMonth() + 1,
          trades: 0,
          totalRR: 0,
          totalPnL: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          averageRR: 0,
          bestTrade: 0,
          worstTrade: 0,
          profitFactor: 0
        });
      }

      const stat = monthMap.get(monthKey)!;
      stat.trades++;
      stat.totalRR += trade.rr || 0;
      stat.totalPnL += trade.pnl_amount || 0;

      const isWin =
        (trade.rr && trade.rr > 0) ||
        (trade.pnl_amount && trade.pnl_amount > 0);
      if (isWin) {
        stat.wins++;
        stat.bestTrade = Math.max(
          stat.bestTrade,
          trade.rr || trade.pnl_amount || 0
        );
      } else {
        stat.losses++;
        stat.worstTrade = Math.min(
          stat.worstTrade,
          trade.rr || trade.pnl_amount || 0
        );
      }
    });

    // Calculate derived stats
    return Array.from(monthMap.values())
      .map((stat) => {
        const winRR = trades
          .filter((t) => {
            const date = new Date(t.entry_date);
            return (
              date.getFullYear() === stat.year &&
              date.getMonth() + 1 === stat.monthNumber &&
              ((t.rr && t.rr > 0) || (t.pnl_amount && t.pnl_amount > 0))
            );
          })
          .reduce((sum, t) => sum + (t.rr || 0), 0);

        const lossRR = Math.abs(
          trades
            .filter((t) => {
              const date = new Date(t.entry_date);
              return (
                date.getFullYear() === stat.year &&
                date.getMonth() + 1 === stat.monthNumber &&
                ((t.rr && t.rr < 0) || (t.pnl_amount && t.pnl_amount < 0))
              );
            })
            .reduce((sum, t) => sum + (t.rr || 0), 0)
        );

        return {
          ...stat,
          winRate: stat.trades > 0 ? (stat.wins / stat.trades) * 100 : 0,
          averageRR: stat.trades > 0 ? stat.totalRR / stat.trades : 0,
          profitFactor: lossRR > 0 ? winRR / lossRR : winRR > 0 ? 999 : 0
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.monthNumber - a.monthNumber;
      });
  }, [trades]);

  // Calculate trade duration statistics
  const durationStats = useMemo(() => {
    const durationMap = new Map<string, TradeDurationStats>();

    trades.forEach((trade) => {
      if (!trade.entry_date || !trade.exit_date) return;

      const entry = new Date(trade.entry_date);
      const exit = new Date(trade.exit_date);
      const durationMs = exit.getTime() - entry.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationMs / (1000 * 60 * 60 * 24);

      let durationKey: string;
      if (durationHours < 1) {
        durationKey = '< 1 hour';
      } else if (durationHours < 4) {
        durationKey = '1-4 hours';
      } else if (durationHours < 24) {
        durationKey = '4-24 hours';
      } else if (durationDays < 7) {
        durationKey = '1-7 days';
      } else {
        durationKey = '> 7 days';
      }

      if (!durationMap.has(durationKey)) {
        durationMap.set(durationKey, {
          duration: durationKey,
          trades: 0,
          totalRR: 0,
          winRate: 0
        });
      }

      const stat = durationMap.get(durationKey)!;
      stat.trades++;
      stat.totalRR += trade.rr || 0;
    });

    return Array.from(durationMap.values()).map((stat) => {
      const wins = trades.filter((t) => {
        if (!t.entry_date || !t.exit_date) return false;
        const entry = new Date(t.entry_date);
        const exit = new Date(t.exit_date);
        const durationMs = exit.getTime() - entry.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const durationDays = durationMs / (1000 * 60 * 60 * 24);

        let durationKey: string;
        if (durationHours < 1) {
          durationKey = '< 1 hour';
        } else if (durationHours < 4) {
          durationKey = '1-4 hours';
        } else if (durationHours < 24) {
          durationKey = '4-24 hours';
        } else if (durationDays < 7) {
          durationKey = '1-7 days';
        } else {
          durationKey = '> 7 days';
        }

        return (
          durationKey === stat.duration &&
          ((t.rr && t.rr > 0) || (t.pnl_amount && t.pnl_amount > 0))
        );
      }).length;

      return {
        ...stat,
        winRate: stat.trades > 0 ? (wins / stat.trades) * 100 : 0
      };
    });
  }, [trades]);

  // Calculate win/loss distribution
  const winLossDistribution = useMemo(() => {
    const ranges: WinLossDistribution[] = [
      { range: '< -5R', count: 0, totalRR: 0 },
      { range: '-5R to -2R', count: 0, totalRR: 0 },
      { range: '-2R to -1R', count: 0, totalRR: 0 },
      { range: '-1R to 0R', count: 0, totalRR: 0 },
      { range: '0R to 1R', count: 0, totalRR: 0 },
      { range: '1R to 2R', count: 0, totalRR: 0 },
      { range: '2R to 5R', count: 0, totalRR: 0 },
      { range: '> 5R', count: 0, totalRR: 0 }
    ];

    trades.forEach((trade) => {
      const rr = trade.rr || 0;
      let rangeIndex = 0;

      if (rr < -5) rangeIndex = 0;
      else if (rr < -2) rangeIndex = 1;
      else if (rr < -1) rangeIndex = 2;
      else if (rr < 0) rangeIndex = 3;
      else if (rr < 1) rangeIndex = 4;
      else if (rr < 2) rangeIndex = 5;
      else if (rr < 5) rangeIndex = 6;
      else rangeIndex = 7;

      ranges[rangeIndex].count++;
      ranges[rangeIndex].totalRR += rr;
    });

    return ranges;
  }, [trades]);

  const formatRR = (rr: number) => {
    return `${rr >= 0 ? '+' : ''}${rr.toFixed(2)}R`;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return `${amount >= 0 ? '+' : ''}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-400">
            Loading advanced performance analysis...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTrades}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No trades available for analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">
          Advanced Performance Analysis
        </h3>
        <p className="text-sm text-slate-400">
          Comprehensive insights into your trading performance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: ChartBarIcon },
          { id: 'monthly', label: 'Monthly', icon: CalendarIcon },
          { id: 'duration', label: 'Duration', icon: ClockIcon },
          { id: 'distribution', label: 'Distribution', icon: TrendingUpIcon },
          { id: 'risk', label: 'Risk Metrics', icon: ExclamationTriangleIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          if (!Icon || !isValidIcon(Icon)) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors rounded-lg ${
                activeTab === tab.id
                  ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overviewStats && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <MetricCard
              label="Total Trades"
              value={overviewStats.totalTrades}
              icon={ChartBarIcon}
              color="blue"
            />
            <MetricCard
              label="Win Rate"
              value={`${overviewStats.winRate.toFixed(1)}%`}
              icon={TrophyIcon}
              color="emerald"
            />
            <MetricCard
              label="Total RR"
              value={formatRR(overviewStats.totalRR)}
              icon={TrendingUpIcon}
              color={overviewStats.totalRR >= 0 ? 'emerald' : 'red'}
            />
            <MetricCard
              label="Profit Factor"
              value={
                overviewStats.profitFactor > 999
                  ? '∞'
                  : overviewStats.profitFactor.toFixed(2)
              }
              icon={StarIcon}
              color="purple"
            />
            <MetricCard
              label="Expectancy"
              value={formatRR(overviewStats.expectancy)}
              icon={TrendingUpIcon}
              color={overviewStats.expectancy >= 0 ? 'emerald' : 'red'}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={overviewStats.sharpeRatio.toFixed(2)}
              icon={ChartBarIcon}
              color="cyan"
            />
          </div>

          {/* Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard title="Win/Loss Breakdown" icon={ChartBarIcon}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Wins</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${
                            (overviewStats.wins / overviewStats.totalTrades) *
                            100
                          }%`
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold">
                      {overviewStats.wins}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Losses</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${
                            (overviewStats.losses / overviewStats.totalTrades) *
                            100
                          }%`
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold">
                      {overviewStats.losses}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Avg Win</span>
                    <span className="text-green-400 font-medium">
                      {formatRR(overviewStats.averageWin)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Avg Loss</span>
                    <span className="text-red-400 font-medium">
                      {formatRR(overviewStats.averageLoss)}
                    </span>
                  </div>
                </div>
              </div>
            </PerformanceCard>

            <PerformanceCard title="Streaks" icon={FireIcon}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Win Streak</span>
                    <span className="text-green-400 text-2xl font-bold">
                      {overviewStats.maxWinStreak}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (overviewStats.maxWinStreak /
                            Math.max(
                              overviewStats.maxWinStreak,
                              overviewStats.maxLossStreak,
                              1
                            )) *
                          100
                        }%`
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Loss Streak</span>
                    <span className="text-red-400 text-2xl font-bold">
                      {overviewStats.maxLossStreak}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (overviewStats.maxLossStreak /
                            Math.max(
                              overviewStats.maxWinStreak,
                              overviewStats.maxLossStreak,
                              1
                            )) *
                          100
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </PerformanceCard>

            <PerformanceCard title="Trade Duration" icon={ClockIcon}>
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {overviewStats.avgDurationHours < 24
                      ? `${overviewStats.avgDurationHours.toFixed(1)}h`
                      : `${overviewStats.avgDurationDays.toFixed(1)}d`}
                  </div>
                  <div className="text-sm text-slate-400">
                    Average Hold Time
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Trades/Day</span>
                    <span className="text-white font-medium">
                      {overviewStats.tradesPerDay.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Trades/Week</span>
                    <span className="text-white font-medium">
                      {overviewStats.tradesPerWeek.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Trades/Month</span>
                    <span className="text-white font-medium">
                      {overviewStats.tradesPerMonth.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </PerformanceCard>

            <PerformanceCard title="Best & Worst" icon={TrophyIcon}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-slate-300">Best Trade</span>
                  <span className="text-green-400 font-bold text-lg">
                    {formatRR(overviewStats.bestTrade)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <span className="text-slate-300">Worst Trade</span>
                  <span className="text-red-400 font-bold text-lg">
                    {formatRR(overviewStats.worstTrade)}
                  </span>
                </div>
              </div>
            </PerformanceCard>

            <PerformanceCard title="Drawdown" icon={TrendingDownIcon}>
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-1">
                    {overviewStats.maxDrawdown > 0
                      ? `-${overviewStats.maxDrawdown.toFixed(2)}R`
                      : '0.00R'}
                  </div>
                  <div className="text-sm text-slate-400">Max Drawdown</div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Recovery Factor</span>
                    <span className="text-white font-medium">
                      {overviewStats.recoveryFactor > 999
                        ? '∞'
                        : overviewStats.recoveryFactor > 0
                          ? overviewStats.recoveryFactor.toFixed(2)
                          : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </PerformanceCard>

            <PerformanceCard
              title="Risk Metrics"
              icon={ExclamationTriangleIcon}
            >
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Kelly Criterion</span>
                    <span className="text-white font-medium">
                      {overviewStats.kellyPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(overviewStats.kellyPercent, 100)}%`
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Risk of Ruin</span>
                    <span
                      className={`font-medium ${
                        overviewStats.riskOfRuin < 10
                          ? 'text-green-400'
                          : overviewStats.riskOfRuin < 25
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {overviewStats.riskOfRuin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        overviewStats.riskOfRuin < 10
                          ? 'bg-green-500'
                          : overviewStats.riskOfRuin < 25
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${overviewStats.riskOfRuin}%` }}
                    />
                  </div>
                </div>
              </div>
            </PerformanceCard>
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                    Month
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    Trades
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    Total RR
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    Avg RR
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    Win Rate
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    W/L
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                    P.Factor
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((stat, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">
                        {stat.month} {stat.year}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {stat.trades}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          stat.totalRR >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatRR(stat.totalRR)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`text-sm ${
                          stat.averageRR >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatRR(stat.averageRR)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {stat.winRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-400">
                      {stat.wins}W / {stat.losses}L
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {stat.profitFactor > 999
                        ? '∞'
                        : stat.profitFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Duration Tab */}
      {activeTab === 'duration' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {durationStats.map((stat) => {
              const maxTrades = Math.max(
                ...durationStats.map((s) => s.trades),
                1
              );
              const barWidth = (stat.trades / maxTrades) * 100;

              return (
                <div
                  key={stat.duration}
                  className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-white">
                      {stat.duration}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {stat.trades} trades
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden relative mb-2">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {stat.trades}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total RR</span>
                    <span
                      className={`font-medium ${
                        stat.totalRR >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {formatRR(stat.totalRR)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Win Rate</span>
                    <span className="text-slate-300">
                      {stat.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {winLossDistribution.map((dist) => {
              const maxCount = Math.max(
                ...winLossDistribution.map((d) => d.count),
                1
              );
              const barWidth = (dist.count / maxCount) * 100;
              const isPositive =
                dist.range.includes('>') ||
                (dist.range.includes('to') && !dist.range.startsWith('-'));

              return (
                <div
                  key={dist.range}
                  className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{dist.range}</span>
                    <span className="text-slate-400 text-sm">
                      {dist.count} trades
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-6 overflow-hidden relative mb-2">
                    <div
                      className={`h-full transition-all ${
                        isPositive ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {dist.count > 0 && dist.count}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    Total RR: {formatRR(dist.totalRR)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Metrics Tab */}
      {activeTab === 'risk' && overviewStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RiskMetricCard
              title="Kelly Criterion"
              value={`${overviewStats.kellyPercent.toFixed(2)}%`}
              description="Optimal position sizing percentage based on win rate and risk/reward"
              color="blue"
            />
            <RiskMetricCard
              title="Risk of Ruin"
              value={`${overviewStats.riskOfRuin.toFixed(1)}%`}
              description="Probability of losing entire account based on current strategy"
              color={
                overviewStats.riskOfRuin < 10
                  ? 'green'
                  : overviewStats.riskOfRuin < 25
                    ? 'yellow'
                    : 'red'
              }
            />
            <RiskMetricCard
              title="Recovery Factor"
              value={
                overviewStats.recoveryFactor > 999
                  ? '∞'
                  : overviewStats.recoveryFactor.toFixed(2)
              }
              description="Total profit divided by maximum drawdown"
              color="purple"
            />
            <RiskMetricCard
              title="Max Drawdown"
              value={
                overviewStats.maxDrawdown > 0
                  ? `-${overviewStats.maxDrawdown.toFixed(2)}R`
                  : '0.00R'
              }
              description="Largest peak-to-trough decline in cumulative returns"
              color="red"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function MetricCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  if (!Icon) return null;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    yellow: 'bg-yellow-500/20 text-yellow-400'
  };

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
      <div className="flex items-center space-x-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function PerformanceCard({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: any;
  children: ReactNode;
}) {
  return (
    <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600/50">
      <div className="flex items-center space-x-2 mb-4">
        {Icon && <Icon className="h-5 w-5 text-blue-400" />}
        <h4 className="text-lg font-semibold text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function RiskMetricCard({
  title,
  value,
  description,
  color
}: {
  title: string;
  value: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/50 bg-blue-500/10',
    green: 'border-green-500/50 bg-green-500/10',
    yellow: 'border-yellow-500/50 bg-yellow-500/10',
    red: 'border-red-500/50 bg-red-500/10',
    purple: 'border-purple-500/50 bg-purple-500/10'
  };

  const textColorClasses: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400'
  };

  return (
    <div
      className={`rounded-lg p-6 border ${colorClasses[color] || colorClasses.blue}`}
    >
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <div
        className={`text-3xl font-bold mb-3 ${textColorClasses[color] || textColorClasses.blue}`}
      >
        {value}
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
