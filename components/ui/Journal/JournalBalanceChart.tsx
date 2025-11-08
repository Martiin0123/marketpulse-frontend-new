'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ChartBar,
  Warning,
  Calendar,
  ChartLine,
  Target,
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

interface RRPoint {
  date: string;
  rr: number;
  trades: number;
}

export default function JournalBalanceChart({
  accountId,
  currency,
  initialBalance,
  className = '',
  refreshKey = 0
}: JournalBalanceChartProps) {
  const [rrData, setRrData] = useState<RRPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    '7d' | '30d' | '90d' | 'all'
  >('30d');
  const [hoveredPoint, setHoveredPoint] = useState<RRPoint | null>(null);

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

        // Calculate RR progression - only create points for days with trades
        const rrPoints: RRPoint[] = [];
        let runningRR = 0;

        // Add initial point
        rrPoints.push({
          date: startDate.toISOString().split('T')[0],
          rr: runningRR,
          trades: 0
        });

        // Sort trades by date
        const sortedTrades = (tradesData || []).sort(
          (a, b) =>
            new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
        );

        // Create points only for days with trades
        sortedTrades.forEach((trade) => {
          if (trade.rr !== null && trade.rr !== undefined) {
            runningRR += trade.rr;
            rrPoints.push({
              date: trade.entry_date.split('T')[0],
              rr: runningRR,
              trades: 1 // Each trade gets its own point
            });
          }
        });

        setRrData(rrPoints);
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

  // Convert RR data to chart format
  const chartData = useMemo(() => {
    if (rrData.length === 0) return [];

    return rrData.map((point, index) => {
      // Calculate RR change for this point
      let rrChange = 0;
      if (index === 0) {
        // First point has no RR change
        rrChange = 0;
      } else {
        // RR change is the difference from previous RR
        rrChange = point.rr - rrData[index - 1].rr;
      }

      return {
        date: new Date(point.date),
        balance: point.rr, // Using balance field for chart compatibility
        pnl: rrChange
      };
    });
  }, [rrData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (rrData.length === 0) {
      return {
        totalTrades: 0,
        totalRR: 0,
        bestDay: 0,
        worstDay: 0,
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        winStreak: 0,
        loseStreak: 0
      };
    }

    const totalTrades = rrData.reduce((sum, point) => sum + point.trades, 0);
    const totalRR = rrData[rrData.length - 1]?.rr || 0;

    // Calculate daily RR changes
    const dailyRR = rrData.slice(1).map((point, index) => {
      const prevPoint = rrData[index];
      return point.rr - prevPoint.rr;
    });

    const profitableDays = dailyRR.filter((rr) => rr > 0);
    const losingDays = dailyRR.filter((rr) => rr < 0);

    const bestDay = dailyRR.length > 0 ? Math.max(...dailyRR) : 0;
    const worstDay = dailyRR.length > 0 ? Math.min(...dailyRR) : 0;
    const averageWin =
      profitableDays.length > 0
        ? profitableDays.reduce((sum, rr) => sum + rr, 0) /
          profitableDays.length
        : 0;
    const averageLoss =
      losingDays.length > 0
        ? losingDays.reduce((sum, rr) => sum + rr, 0) / losingDays.length
        : 0;

    // Calculate streaks
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let maxWinStreak = 0;
    let maxLoseStreak = 0;

    dailyRR.forEach((rr) => {
      if (rr > 0) {
        currentWinStreak++;
        currentLoseStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (rr < 0) {
        currentLoseStreak++;
        currentWinStreak = 0;
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
      }
    });

    // Calculate max drawdown in RR
    let maxDrawdown = 0;
    let peak = 0;
    let current = 0;

    for (const point of rrData) {
      current = point.rr;
      if (current > peak) {
        peak = current;
      }
      const drawdown = peak - current;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades,
      totalRR,
      bestDay,
      worstDay,
      averageWin,
      averageLoss,
      maxDrawdown,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak
    };
  }, [rrData]);

  const formatRR = (rr: number) => {
    if (isNaN(rr) || rr === null || rr === undefined) {
      return '0.00R';
    }
    const sign = rr >= 0 ? '+' : '';
    return `${sign}${rr.toFixed(2)}R`;
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
              RR Progression
            </h3>
            <p className="text-slate-400 text-sm">
              Your trading journey over time
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold text-white mb-2">
            {formatRR(rrData[rrData.length - 1]?.rr || 0)}
          </div>
          <div className="text-slate-400 text-sm flex items-center justify-end">
            <ChartLine className="h-4 w-4 mr-1" />
            Total RR
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
              {formatRR(hoveredPoint.rr)}
            </div>
            <div className="text-sm text-slate-400">
              {hoveredPoint.trades} trades
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
