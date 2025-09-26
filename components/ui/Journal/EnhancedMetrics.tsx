'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { TradeEntry } from '@/types/journal';

interface EnhancedMetricsProps {
  accountId: string | null; // null for combined view
  currency: string;
  initialBalance: number;
  className?: string;
}

interface TradingMetrics {
  netPnL: number;
  tradeExpectancy: number;
  profitFactor: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winStreak: number;
  lossStreak: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  expectancy: number;
}

export default function EnhancedMetrics({
  accountId,
  currency,
  initialBalance,
  className = ''
}: EnhancedMetricsProps) {
  const [metrics, setMetrics] = useState<TradingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const calculateMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all closed trades
        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .eq('status', 'closed')
          .order('entry_date', { ascending: true });

        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: trades, error: tradesError } = await query;

        if (tradesError) {
          console.error('Error fetching trades for metrics:', tradesError);
          setError('Failed to load metrics');
          return;
        }

        const closedTrades = (trades || []) as any[];

        if (closedTrades.length === 0) {
          setMetrics({
            netPnL: 0,
            tradeExpectancy: 0,
            profitFactor: 0,
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            totalTrades: 0,
            winTrades: 0,
            lossTrades: 0,
            maxDrawdown: 0,
            currentDrawdown: 0,
            winStreak: 0,
            lossStreak: 0,
            bestTrade: 0,
            worstTrade: 0,
            sharpeRatio: 0,
            expectancy: 0
          });
          return;
        }

        // Calculate basic metrics
        const pnlValues = closedTrades.map((trade) => trade.pnl || 0);
        const netPnL = pnlValues.reduce((sum, pnl) => sum + pnl, 0);

        const wins = pnlValues.filter((pnl) => pnl > 0);
        const losses = pnlValues.filter((pnl) => pnl < 0);

        const winTrades = wins.length;
        const lossTrades = losses.length;
        const totalTrades = closedTrades.length;
        const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

        const averageWin =
          wins.length > 0
            ? wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length
            : 0;
        const averageLoss =
          losses.length > 0
            ? Math.abs(
                losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length
              )
            : 0;

        const totalWins = wins.reduce((sum, pnl) => sum + pnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
        const profitFactor =
          totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

        const tradeExpectancy = totalTrades > 0 ? netPnL / totalTrades : 0;

        const bestTrade = Math.max(...pnlValues);
        const worstTrade = Math.min(...pnlValues);

        // Calculate streaks
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;

        for (const pnl of pnlValues) {
          if (pnl > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          } else if (pnl < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
          }
        }

        // Calculate drawdown
        let maxDrawdown = 0;
        let currentDrawdown = 0;
        let peak = initialBalance;
        let current = initialBalance;

        for (const pnl of pnlValues) {
          current += pnl;
          if (current > peak) {
            peak = current;
          }
          const drawdown = peak - current;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
          if (current === closedTrades.length - 1) {
            currentDrawdown = drawdown;
          }
        }

        // Calculate Sharpe ratio (simplified)
        const meanReturn =
          pnlValues.reduce((sum, pnl) => sum + pnl, 0) / pnlValues.length;
        const variance =
          pnlValues.reduce(
            (sum, pnl) => sum + Math.pow(pnl - meanReturn, 2),
            0
          ) / pnlValues.length;
        const standardDeviation = Math.sqrt(variance);
        const sharpeRatio =
          standardDeviation > 0 ? meanReturn / standardDeviation : 0;

        // Calculate expectancy (probability-weighted average)
        const winProbability = winTrades / totalTrades;
        const lossProbability = lossTrades / totalTrades;
        const expectancy =
          winProbability * averageWin - lossProbability * averageLoss;

        setMetrics({
          netPnL,
          tradeExpectancy,
          profitFactor,
          winRate,
          averageWin,
          averageLoss,
          totalTrades,
          winTrades,
          lossTrades,
          maxDrawdown,
          currentDrawdown,
          winStreak: maxWinStreak,
          lossStreak: maxLossStreak,
          bestTrade,
          worstTrade,
          sharpeRatio,
          expectancy
        });
      } catch (err) {
        console.error('Error calculating metrics:', err);
        setError('Failed to calculate metrics');
      } finally {
        setIsLoading(false);
      }
    };

    calculateMetrics();
  }, [accountId, initialBalance, supabase]);

  if (isLoading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-400">
          <p>{error || 'Failed to load metrics'}</p>
        </div>
      </div>
    );
  }

  const isProfit = metrics.netPnL >= 0;
  const winLossRatio =
    metrics.averageLoss > 0
      ? metrics.averageWin / metrics.averageLoss
      : metrics.averageWin;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Compact Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Net P&L */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Net P&L</div>
          <div
            className={`text-lg font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}
          >
            {currency} {metrics.netPnL.toLocaleString()}
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Win Rate</div>
          <div className="text-lg font-bold text-white">
            {metrics.winRate.toFixed(1)}%
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Profit Factor</div>
          <div className="text-lg font-bold text-white">
            {metrics.profitFactor.toFixed(1)}
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Total Trades</div>
          <div className="text-lg font-bold text-white">
            {metrics.totalTrades}
          </div>
        </div>
      </div>

      {/* Compact Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Best Trade</div>
          <div className="text-sm font-semibold text-green-400">
            {currency} {metrics.bestTrade.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Worst Trade</div>
          <div className="text-sm font-semibold text-red-400">
            {currency} {metrics.worstTrade.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Max Drawdown</div>
          <div className="text-sm font-semibold text-orange-400">
            {currency} {metrics.maxDrawdown.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Win Streak</div>
          <div className="text-sm font-semibold text-green-400">
            {metrics.winStreak}
          </div>
        </div>
      </div>
    </div>
  );
}
