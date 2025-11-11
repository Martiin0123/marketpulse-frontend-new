'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import type { AccountStats } from '@/types/journal';

interface CopyTradeAccount {
  id: string;
  name: string;
  currency: string;
  sourceAccountId: string;
  sourceAccountName: string;
  multiplier: number;
  enabled: boolean;
  stats: AccountStats;
  todayPnL: {
    openPnL: number;
    realizedPnL: number;
  };
}

interface CopyTradeAccountsProps {
  refreshKey?: number;
}

export default function CopyTradeAccounts({ refreshKey = 0 }: CopyTradeAccountsProps) {
  const [accounts, setAccounts] = useState<CopyTradeAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCopyTradeAccounts();
  }, [refreshKey]);

  const loadCopyTradeAccounts = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get all active copy trade configs
      const { data: configs, error: configError } = await supabase
        .from('copy_trade_configs' as any)
        .select('*, source_account:trading_accounts!copy_trade_configs_source_account_id_fkey(id, name), destination_account:trading_accounts!copy_trade_configs_destination_account_id_fkey(id, name, currency)')
        .eq('user_id', user.id)
        .eq('enabled', true);

      if (configError) {
        console.error('Error loading copy trade configs:', configError);
        return;
      }

      if (!configs || configs.length === 0) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      // Get stats and PnL for each destination account
      const accountsWithStats = await Promise.all(
        configs.map(async (config: any) => {
          const destinationAccountId = config.destination_account_id;
          const sourceAccountId = config.source_account_id;

          // Calculate account stats (similar to journal page)
          const stats = await calculateAccountStats(destinationAccountId);

          // Calculate today's PnL
          const todayPnL = await calculateTodayPnL(destinationAccountId);

          return {
            id: destinationAccountId,
            name: config.destination_account?.name || 'Unknown',
            currency: config.destination_account?.currency || 'USD',
            sourceAccountId: sourceAccountId,
            sourceAccountName: config.source_account?.name || 'Unknown',
            multiplier: config.multiplier,
            enabled: config.enabled,
            stats,
            todayPnL
          };
        })
      );

      setAccounts(accountsWithStats);
    } catch (error) {
      console.error('Error loading copy trade accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAccountStats = async (accountId: string): Promise<AccountStats> => {
    try {
      const { data: trades, error } = await supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'closed');

      if (error || !trades || trades.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          averageRR: 0,
          totalRR: 0,
          bestTrade: 0,
          worstTrade: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          winStreak: 0,
          loseStreak: 0,
          totalPnL: 0,
          totalOpportunityCost: 0,
          expectedValue: 0,
          sharpeRatio: 0,
          bestTPRR: 0
        };
      }

      const tradesWithData = trades.filter(
        (trade: any) =>
          (trade.rr !== null && trade.rr !== undefined) ||
          (trade.pnl_amount !== null && trade.pnl_amount !== undefined)
      );

      if (tradesWithData.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          averageRR: 0,
          totalRR: 0,
          bestTrade: 0,
          worstTrade: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          winStreak: 0,
          loseStreak: 0,
          totalPnL: 0,
          totalOpportunityCost: 0,
          expectedValue: 0,
          sharpeRatio: 0,
          bestTPRR: 0
        };
      }

      const totalTrades = tradesWithData.length;
      const wins = tradesWithData.filter(
        (trade: any) =>
          (trade.rr !== null && trade.rr !== undefined && trade.rr > 0) ||
          (trade.rr === null && trade.pnl_amount !== null && trade.pnl_amount > 0)
      );
      const losses = tradesWithData.filter(
        (trade: any) =>
          (trade.rr !== null && trade.rr !== undefined && trade.rr < 0) ||
          (trade.rr === null && trade.pnl_amount !== null && trade.pnl_amount < 0)
      );
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      const pnlValues = tradesWithData
        .map((trade: any) => trade.pnl_amount || 0)
        .filter((pnl: any) => pnl !== null && pnl !== undefined);
      const totalPnL =
        pnlValues.length > 0 ? pnlValues.reduce((sum: number, pnl: number) => sum + pnl, 0) : 0;

      const rrValues = tradesWithData
        .map((trade: any) => trade.rr || 0)
        .filter((rr: any) => rr !== null && rr !== undefined);
      const totalRR = rrValues.length > 0 ? rrValues.reduce((sum: number, rr: number) => sum + rr, 0) : 0;
      const averageRR = rrValues.length > 0 ? totalRR / rrValues.length : 0;

      const winRR = wins.reduce((sum: number, trade: any) => sum + (trade.rr || 0), 0);
      const lossRR = Math.abs(losses.reduce((sum: number, trade: any) => sum + (trade.rr || 0), 0));
      const profitFactor = lossRR > 0 ? winRR / lossRR : winRR > 0 ? 999 : 0;

      const averageWin = wins.length > 0 ? winRR / wins.length : 0;
      const averageLoss = losses.length > 0 ? lossRR / losses.length : 0;

      // Calculate streaks
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let currentWinStreak = 0;
      let currentLossStreak = 0;

      const sortedTrades = [...tradesWithData].sort(
        (a: any, b: any) =>
          new Date(a.exit_date || a.entry_date).getTime() -
          new Date(b.exit_date || b.entry_date).getTime()
      );

      sortedTrades.forEach((trade: any) => {
        const isWin =
          (trade.rr !== null && trade.rr !== undefined && trade.rr > 0) ||
          (trade.rr === null && trade.pnl_amount !== null && trade.pnl_amount > 0);

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

      return {
        totalTrades,
        winRate,
        averageRR,
        totalRR,
        bestTrade: Math.max(...rrValues, 0),
        worstTrade: Math.min(...rrValues, 0),
        profitFactor,
        averageWin,
        averageLoss,
        maxDrawdown: 0, // Simplified for now
        winStreak: maxWinStreak,
        loseStreak: maxLossStreak,
        totalPnL,
        totalOpportunityCost: 0,
        expectedValue: 0,
        sharpeRatio: 0,
        bestTPRR: 0
      };
    } catch (error) {
      console.error('Error calculating account stats:', error);
      return {
        totalTrades: 0,
        winRate: 0,
        averageRR: 0,
        totalRR: 0,
        bestTrade: 0,
        worstTrade: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        winStreak: 0,
        loseStreak: 0,
        totalPnL: 0,
        totalOpportunityCost: 0,
        expectedValue: 0,
        sharpeRatio: 0,
        bestTPRR: 0
      };
    }
  };

  const calculateTodayPnL = async (accountId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndStr = todayEnd.toISOString();

      // Get open positions
      const { data: openTrades } = await supabase
        .from('trade_entries' as any)
        .select('entry_price, exit_price, side, size, pnl_amount')
        .eq('account_id', accountId)
        .eq('status', 'open');

      let openPnL = 0;
      if (openTrades) {
        openPnL = openTrades.reduce((sum: number, trade: any) => {
          if (trade.pnl_amount !== null && trade.pnl_amount !== undefined) {
            return sum + trade.pnl_amount;
          }
          if (trade.exit_price && trade.entry_price && trade.size) {
            const priceDiff = trade.side === 'long' 
              ? trade.exit_price - trade.entry_price
              : trade.entry_price - trade.exit_price;
            return sum + (priceDiff * trade.size);
          }
          return sum;
        }, 0);
      }

      // Get closed trades from today
      const { data: closedTrades } = await supabase
        .from('trade_entries' as any)
        .select('pnl_amount')
        .eq('account_id', accountId)
        .eq('status', 'closed')
        .gte('exit_date', todayStart)
        .lte('exit_date', todayEndStr);

      const realizedPnL = closedTrades
        ? closedTrades.reduce((sum: number, trade: any) => sum + (trade.pnl_amount || 0), 0)
        : 0;

      return { openPnL, realizedPnL };
    } catch (error) {
      console.error('Error calculating today PnL:', error);
      return { openPnL: 0, realizedPnL: 0 };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-400">Loading copy trade accounts...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <p className="text-slate-400">No active copy trade accounts</p>
          <p className="text-sm text-slate-500 mt-2">
            Create a copy trade configuration to see accounts here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Active Copy Trade Accounts</h2>
          <p className="text-sm text-slate-400 mt-1">
            Accounts receiving copied trades with real-time P&L
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Copying From
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Multiplier
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Today's P&L
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Total P&L
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Total RR
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Trades
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {accounts.map((account) => {
                const totalTodayPnL = account.todayPnL.openPnL + account.todayPnL.realizedPnL;
                return (
                  <tr key={account.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{account.name}</div>
                      <div className="text-xs text-slate-400">{account.currency}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{account.sourceAccountName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-cyan-400">
                        {account.multiplier}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {totalTodayPnL >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
                        )}
                        <span
                          className={`text-sm font-bold ${
                            totalTodayPnL >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {totalTodayPnL >= 0 ? '+' : ''}
                          {totalTodayPnL.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}{' '}
                          {account.currency}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 text-right">
                        Open: {account.todayPnL.openPnL >= 0 ? '+' : ''}
                        {account.todayPnL.openPnL.toFixed(2)} | Realized:{' '}
                        {account.todayPnL.realizedPnL >= 0 ? '+' : ''}
                        {account.todayPnL.realizedPnL.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-bold ${
                          account.stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {account.stats.totalPnL >= 0 ? '+' : ''}
                        {account.stats.totalPnL.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}{' '}
                        {account.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-slate-300">
                        {Math.round(account.stats.winRate)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-medium ${
                          account.stats.totalRR >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {account.stats.totalRR >= 0 ? '+' : ''}
                        {account.stats.totalRR.toFixed(2)}R
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-slate-300">
                        {account.stats.totalTrades}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

