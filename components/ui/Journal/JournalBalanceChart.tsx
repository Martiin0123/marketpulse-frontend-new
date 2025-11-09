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
  balance: number; // Currency balance
  trades: number;
  pnl?: number; // Daily PnL
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
  const [allTrades, setAllTrades] = useState<TradeEntry[]>([]); // Store all trades for total P&L calculation
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

        // First, fetch ALL trades for total P&L calculation
        let allTradesQuery = supabase
          .from('trade_entries' as any)
          .select('*')
          .eq('status', 'closed')
          .order('entry_date', { ascending: true });

        if (accountId) {
          allTradesQuery = allTradesQuery.eq('account_id', accountId);
        }

        const { data: allTradesData, error: allTradesError } = await allTradesQuery;
        
        if (allTradesError) {
          console.error('Error fetching all trades:', allTradesError);
        } else {
          setAllTrades(allTradesData || []);
        }

        // Then fetch trades for the selected period (for chart display)
        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .eq('status', 'closed')
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

        // Calculate both RR and currency progression
        const rrPoints: RRPoint[] = [];
        let runningRR = 0;
        let runningBalance = initialBalance;

        // Only add initial point if we have trades, otherwise start from first trade
        // (We'll add it after processing trades if needed)

        // Sort trades by date
        const sortedTrades = (tradesData || []).sort(
          (a, b) =>
            new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
        );

        // Group trades by date to avoid duplicate points
        const tradesByDate = new Map<string, any[]>();
        sortedTrades.forEach((trade) => {
          const dateStr = trade.entry_date.split('T')[0];
          if (!tradesByDate.has(dateStr)) {
            tradesByDate.set(dateStr, []);
          }
          tradesByDate.get(dateStr)!.push(trade);
        });

        // Add initial point if we have trades
        if (tradesByDate.size > 0) {
          // Get the first trade date
          const firstDate = Array.from(tradesByDate.keys()).sort()[0];
          rrPoints.push({
            date: firstDate,
            rr: runningRR,
            balance: initialBalance, // Start with initial balance, not runningBalance
            trades: 0
          });
        }

        // Create points for each day with trades
        const sortedDates = Array.from(tradesByDate.keys()).sort();
        sortedDates.forEach((dateStr) => {
          const dayTrades = tradesByDate.get(dateStr)!;

          // Aggregate RR and PnL for this day
          let dayRR = 0;
          let dayPnL = 0;

          dayTrades.forEach((trade) => {
            // Update RR if available
            if (
              trade.rr !== null &&
              trade.rr !== undefined &&
              !isNaN(trade.rr)
            ) {
              dayRR += trade.rr;
            }

            // Update currency balance if PnL available
            if (
              trade.pnl_amount !== null &&
              trade.pnl_amount !== undefined &&
              !isNaN(trade.pnl_amount)
            ) {
              dayPnL += trade.pnl_amount;
            }
          });

          // Update running totals
          runningRR += dayRR;
          runningBalance += dayPnL;

          // Add point for this day
          rrPoints.push({
            date: dateStr,
            rr: runningRR,
            balance: runningBalance,
            trades: dayTrades.length
          });
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

  // Convert data to chart format
  // Chart displays dollar amounts (balance) as primary
  const chartData = useMemo(() => {
    if (rrData.length === 0) return [];

    return rrData.map((point, index) => {
      // Calculate PnL change for this point
      let pnlChange = 0;
      if (index === 0) {
        pnlChange = 0;
      } else {
        pnlChange = point.balance - rrData[index - 1].balance;
      }

      return {
        date: new Date(point.date),
        balance: point.balance, // Primary display: dollar balance
        balanceCurrency: point.balance, // Same as balance (dollar amount)
        pnl: pnlChange,
        rr: point.rr, // Keep RR for reference
        trades: point.trades // Include trade count for hover
      };
    });
  }, [rrData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (rrData.length === 0 || !trades || trades.length === 0) {
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

    // Use actual trades count, not points count
    const totalTrades = trades.length;
    const totalRR = rrData[rrData.length - 1]?.rr || 0;

    // Calculate stats from actual trades, not aggregated points
    const tradesWithRR = trades.filter(
      (t: any) => t.rr !== null && t.rr !== undefined && !isNaN(t.rr)
    );

    const wins = tradesWithRR.filter((t: any) => t.rr > 0);
    const losses = tradesWithRR.filter((t: any) => t.rr < 0);

    const winRate =
      tradesWithRR.length > 0 ? (wins.length / tradesWithRR.length) * 100 : 0;

    const averageWin =
      wins.length > 0
        ? wins.reduce((sum: number, t: any) => sum + t.rr, 0) / wins.length
        : 0;
    const averageLoss =
      losses.length > 0
        ? losses.reduce((sum: number, t: any) => sum + t.rr, 0) / losses.length
        : 0;

    // Calculate daily RR changes for streaks
    const dailyRR = rrData.slice(1).map((point, index) => {
      const prevPoint = rrData[index];
      return point.rr - prevPoint.rr;
    });

    const bestDay = dailyRR.length > 0 ? Math.max(...dailyRR) : 0;
    const worstDay = dailyRR.length > 0 ? Math.min(...dailyRR) : 0;

    // Calculate streaks from daily changes
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

    // Calculate average RR
    const averageRR =
      tradesWithRR.length > 0
        ? tradesWithRR.reduce((sum: number, t: any) => sum + t.rr, 0) /
          tradesWithRR.length
        : 0;

    return {
      totalTrades,
      totalRR,
      bestDay,
      worstDay,
      averageWin,
      averageLoss,
      maxDrawdown,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak,
      winRate,
      averageRR
    };
  }, [rrData, trades]);

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
              Performance Overview
            </h3>
            <p className="text-slate-400 text-sm">
              Your trading journey over time
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end text-right">
          <div>
            <div
              className={`text-4xl font-bold mb-2 ${
                (rrData[rrData.length - 1]?.balance || initialBalance) >=
                initialBalance
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {(() => {
                // Calculate total P&L from ALL trades, not just the selected period
                const totalPnL = allTrades.reduce((sum, trade) => {
                  return sum + (trade.pnl_amount || 0);
                }, 0);
                
                // The balance should be initialBalance + totalPnL
                const currentBalance = initialBalance + totalPnL;
                
                return `${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(
                  'en-US',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }
                )}`;
              })()}
            </div>
            <div className="text-slate-400 text-sm flex items-center justify-end">
              <ChartLine className="h-4 w-4 mr-1" />
              Total P&L ({currency})
            </div>
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
        <BalanceCurveChart
          data={chartData}
          onHover={(point) => {
            if (point) {
              // Find matching RRPoint by date - handle both Date objects and strings
              let dateStr: string;
              if (point.date instanceof Date) {
                dateStr = point.date.toISOString().split('T')[0];
              } else if (typeof point.date === 'string') {
                dateStr = point.date.split('T')[0];
              } else {
                dateStr = String(point.date);
              }

              // Normalize date string for comparison (remove time if present)
              const normalizedDate = dateStr.split('T')[0];

              const rrPointIndex = rrData.findIndex((p) => {
                const pDate = p.date.split('T')[0];
                return pDate === normalizedDate;
              });

              if (rrPointIndex !== -1) {
                const rrPoint = rrData[rrPointIndex];
                // Calculate daily PnL (difference from previous day)
                const dailyPnL =
                  rrPointIndex > 0
                    ? rrPoint.balance - rrData[rrPointIndex - 1].balance
                    : 0;

                setHoveredPoint({
                  date: rrPoint.date,
                  rr: rrPoint.rr,
                  balance: rrPoint.balance,
                  trades: rrPoint.trades,
                  pnl: dailyPnL // Add daily PnL
                });
              } else {
                // If no exact match, clear hover
                setHoveredPoint(null);
              }
            } else {
              setHoveredPoint(null);
            }
          }}
        />

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
            <div className="space-y-2">
              {/* Daily PnL */}
              {hoveredPoint.pnl !== undefined && hoveredPoint.pnl !== 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Daily P&L</div>
                  <div
                    className={`text-xl font-bold ${
                      hoveredPoint.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {hoveredPoint.pnl >= 0 ? '+' : ''}
                    {hoveredPoint.pnl.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}{' '}
                    {currency}
                  </div>
                </div>
              )}
              {/* Total P&L */}
              {hoveredPoint.balance !== undefined && (
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Total P&L</div>
                  <div
                    className={`text-2xl font-bold ${
                      hoveredPoint.balance - initialBalance >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {hoveredPoint.balance - initialBalance >= 0 ? '+' : ''}
                    {(hoveredPoint.balance - initialBalance).toLocaleString(
                      'en-US',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }
                    )}{' '}
                    {currency}
                  </div>
                </div>
              )}
              {hoveredPoint.rr !== undefined && hoveredPoint.rr !== 0 && (
                <div className="text-sm font-medium text-slate-400">
                  {formatRR(hoveredPoint.rr)}
                </div>
              )}
              {hoveredPoint.trades > 0 && (
                <div className="text-xs text-slate-400">
                  {hoveredPoint.trades} trade
                  {hoveredPoint.trades !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
