'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface SymbolPerformanceProps {
  accountId: string | null;
  className?: string;
  refreshKey?: number;
}

interface SymbolStats {
  symbol: string;
  trades: number;
  totalRR: number;
  averageRR: number;
  winRate: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

export default function SymbolPerformance({
  accountId,
  className = '',
  refreshKey = 0
}: SymbolPerformanceProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    'symbol' | 'trades' | 'totalRR' | 'winRate'
  >('totalRR');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        .not('rr', 'is', null)
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

  // Calculate symbol statistics
  const symbolStats = useMemo(() => {
    const statsMap = new Map<string, SymbolStats>();

    trades.forEach((trade) => {
      const symbol = trade.symbol || 'UNKNOWN';
      const rr = trade.rr || 0;

      if (!statsMap.has(symbol)) {
        statsMap.set(symbol, {
          symbol,
          trades: 0,
          totalRR: 0,
          averageRR: 0,
          winRate: 0,
          wins: 0,
          losses: 0,
          bestTrade: rr,
          worstTrade: rr,
          profitFactor: 0
        });
      }

      const stat = statsMap.get(symbol)!;
      stat.trades++;
      stat.totalRR += rr;
      if (rr > 0) {
        stat.wins++;
        stat.bestTrade = Math.max(stat.bestTrade, rr);
      } else if (rr < 0) {
        stat.losses++;
        stat.worstTrade = Math.min(stat.worstTrade, rr);
      }
    });

    // Calculate derived stats
    const stats = Array.from(statsMap.values()).map((stat) => {
      const wins = trades.filter(
        (t) => t.symbol === stat.symbol && (t.rr || 0) > 0
      );
      const losses = trades.filter(
        (t) => t.symbol === stat.symbol && (t.rr || 0) < 0
      );

      const totalWins = wins.reduce((sum, t) => sum + (t.rr || 0), 0);
      const totalLosses = Math.abs(
        losses.reduce((sum, t) => sum + (t.rr || 0), 0)
      );

      return {
        ...stat,
        averageRR: stat.trades > 0 ? stat.totalRR / stat.trades : 0,
        winRate: stat.trades > 0 ? (stat.wins / stat.trades) * 100 : 0,
        profitFactor:
          totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0
      };
    });

    return stats;
  }, [trades]);

  // Sort symbol stats
  const sortedStats = useMemo(() => {
    const sorted = [...symbolStats].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'trades':
          aValue = a.trades;
          bValue = b.trades;
          break;
        case 'totalRR':
          aValue = a.totalRR;
          bValue = b.totalRR;
          break;
        case 'winRate':
          aValue = a.winRate;
          bValue = b.winRate;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [symbolStats, sortBy, sortOrder]);

  const formatRR = (rr: number) => {
    return `${rr >= 0 ? '+' : ''}${rr.toFixed(2)}R`;
  };

  const handleSort = (field: 'symbol' | 'trades' | 'totalRR' | 'winRate') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-400">
            Loading symbol performance...
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

  if (symbolStats.length === 0) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">
            No trades available for symbol analysis
          </p>
        </div>
      </div>
    );
  }

  const maxTotalRR = Math.max(
    ...symbolStats.map((s) => Math.abs(s.totalRR)),
    0
  );

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          Performance by Symbol
        </h3>
        <p className="text-sm text-slate-400">
          Analyze your trading performance by symbol
        </p>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex items-center space-x-2">
        <span className="text-sm text-slate-400">Sort by:</span>
        <button
          onClick={() => handleSort('totalRR')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            sortBy === 'totalRR'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Total RR {sortBy === 'totalRR' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('trades')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            sortBy === 'trades'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Trades {sortBy === 'trades' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('winRate')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            sortBy === 'winRate'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Win Rate {sortBy === 'winRate' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => handleSort('symbol')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            sortBy === 'symbol'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Symbol Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                Symbol
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
                Best
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                Worst
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                P.Factor
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat) => {
              const barWidth =
                maxTotalRR > 0
                  ? (Math.abs(stat.totalRR) / maxTotalRR) * 100
                  : 0;
              return (
                <tr
                  key={stat.symbol}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{stat.symbol}</div>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {stat.trades}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="w-24 bg-slate-700 rounded-full h-4 overflow-hidden relative">
                        <div
                          className={`h-full transition-all ${
                            stat.totalRR >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium w-20 text-right ${
                          stat.totalRR >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatRR(stat.totalRR)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-sm ${
                        stat.averageRR >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {formatRR(stat.averageRR)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-300">
                      {stat.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-slate-400">
                    {stat.wins}W / {stat.losses}L
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-green-400">
                      {formatRR(stat.bestTrade)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-red-400">
                      {formatRR(stat.worstTrade)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-slate-300">
                      {stat.profitFactor > 999
                        ? '∞'
                        : stat.profitFactor.toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {(() => {
          const bestSymbol = [...symbolStats].sort(
            (a, b) => b.totalRR - a.totalRR
          )[0];
          const worstSymbol = [...symbolStats].sort(
            (a, b) => a.totalRR - b.totalRR
          )[0];
          const mostTraded = [...symbolStats].sort(
            (a, b) => b.trades - a.trades
          )[0];
          const bestWinRate = [...symbolStats]
            .filter((s) => s.trades >= 5)
            .sort((a, b) => b.winRate - a.winRate)[0];

          return (
            <>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="text-xs text-slate-400 mb-1">
                  Best Performer
                </div>
                <div className="text-lg font-bold text-green-400">
                  {bestSymbol.symbol}
                </div>
                <div className="text-xs text-slate-400">
                  {formatRR(bestSymbol.totalRR)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="text-xs text-slate-400 mb-1">
                  Worst Performer
                </div>
                <div className="text-lg font-bold text-red-400">
                  {worstSymbol.symbol}
                </div>
                <div className="text-xs text-slate-400">
                  {formatRR(worstSymbol.totalRR)}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="text-xs text-slate-400 mb-1">Most Traded</div>
                <div className="text-lg font-bold text-blue-400">
                  {mostTraded.symbol}
                </div>
                <div className="text-xs text-slate-400">
                  {mostTraded.trades} trades
                </div>
              </div>
              {bestWinRate && (
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="text-xs text-slate-400 mb-1">
                    Best Win Rate
                  </div>
                  <div className="text-lg font-bold text-purple-400">
                    {bestWinRate.symbol}
                  </div>
                  <div className="text-xs text-slate-400">
                    {bestWinRate.winRate.toFixed(1)}%
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
