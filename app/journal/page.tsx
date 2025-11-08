'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Gear } from '@phosphor-icons/react';
import AccountSelector from '@/components/ui/Journal/AccountSelector';
import StatsCard from '@/components/ui/Journal/StatsCard';
import TradeCalendar from '@/components/ui/Journal/TradeCalendar';
import TradeList from '@/components/ui/Journal/TradeList';
import EditTradeModal from '@/components/ui/Journal/EditTradeModal';
import ViewSelector from '@/components/ui/Journal/ViewSelector';
import AccountsOverview from '@/components/ui/Journal/AccountsOverview';
import ImageTradeModal from '@/components/ui/Journal/ImageTradeModal';
import JournalBalanceChart from '@/components/ui/Journal/JournalBalanceChart';
import SettingsModal from '@/components/ui/Journal/SettingsModal';
import type {
  TradingAccount,
  AccountStats,
  DailyStats,
  TradeEntry
} from '@/types/journal';

export default function JournalPage() {
  const [accounts, setAccounts] = useState<
    (TradingAccount & { stats: AccountStats })[]
  >([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Debug month state
  console.log('Journal page - currentMonth:', {
    month: currentMonth.getMonth() + 1,
    year: currentMonth.getFullYear(),
    date: currentMonth.getDate(),
    isoString: currentMonth.toISOString()
  });

  // Reset to current month if the month is in the future (likely a bug)
  useEffect(() => {
    const now = new Date();
    if (
      currentMonth.getFullYear() > now.getFullYear() ||
      (currentMonth.getFullYear() === now.getFullYear() &&
        currentMonth.getMonth() > now.getMonth())
    ) {
      console.log('Resetting calendar to current month due to future date');
      setCurrentMonth(new Date());
    }
  }, [currentMonth]);
  const [view, setView] = useState<'individual' | 'combined'>('combined');
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  const calculateAccountStats = async (
    accountId: string
  ): Promise<AccountStats> => {
    try {
      const { data: trades, error } = await supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'closed');

      if (error) {
        console.error('Error fetching trades for stats:', error);
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

      const closedTrades = (trades || []) as any[];

      // Filter out trades with null rr for stats calculation (using RR instead of PnL)
      const tradesWithRR = closedTrades.filter(
        (trade) => trade.rr !== null && trade.rr !== undefined
      );

      if (tradesWithRR.length === 0) {
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

      // Calculate basic stats using RR
      const totalTrades = tradesWithRR.length;
      const wins = tradesWithRR.filter((trade) => trade.rr > 0);
      const losses = tradesWithRR.filter((trade) => trade.rr < 0);
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      // Calculate R:R stats
      const rrValues = tradesWithRR.map((trade) => trade.rr || 0);
      const averageRR =
        rrValues.length > 0
          ? rrValues.reduce((sum, rr) => sum + rr, 0) / rrValues.length
          : 0;
      const totalRR = rrValues.reduce((sum, rr) => sum + rr, 0);

      // Best/worst trade based on RR
      const bestTrade =
        tradesWithRR.length > 0
          ? Math.max(...tradesWithRR.map((trade) => trade.rr))
          : 0;
      const worstTrade =
        tradesWithRR.length > 0
          ? Math.min(...tradesWithRR.map((trade) => trade.rr))
          : 0;

      // Calculate average win/loss in RR
      const averageWin =
        wins.length > 0
          ? wins.reduce((sum, trade) => sum + trade.rr, 0) / wins.length
          : 0;
      const averageLoss =
        losses.length > 0
          ? losses.reduce((sum, trade) => sum + trade.rr, 0) / losses.length
          : 0;

      // Calculate profit factor using RR
      const totalWins = wins.reduce((sum, trade) => sum + trade.rr, 0);
      const totalLosses = Math.abs(
        losses.reduce((sum, trade) => sum + trade.rr, 0)
      );
      const profitFactor =
        totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

      // Calculate streaks using RR
      let currentWinStreak = 0;
      let currentLoseStreak = 0;
      let maxWinStreak = 0;
      let maxLoseStreak = 0;

      for (const trade of tradesWithRR.sort(
        (a, b) =>
          new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
      )) {
        if (trade.rr > 0) {
          currentWinStreak++;
          currentLoseStreak = 0;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        } else if (trade.rr < 0) {
          currentLoseStreak++;
          currentWinStreak = 0;
          maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
        }
      }

      // Calculate max drawdown using RR (cumulative RR)
      let maxDrawdown = 0;
      let peak = 0;
      let current = 0;

      for (const trade of tradesWithRR.sort(
        (a, b) =>
          new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
      )) {
        current += trade.rr;
        if (current > peak) {
          peak = current;
        }
        const drawdown = peak - current;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Total PnL is now totalRR (for backward compatibility)
      const totalPnL = totalRR;

      // Calculate Total Opportunity Cost
      // Opportunity cost = sum of (max_adverse - actual_rr) for trades where max_adverse > actual_rr
      // This represents the RR you could have made if you took profit at max_adverse
      let totalOpportunityCost = 0;
      tradesWithRR.forEach((trade) => {
        if (
          trade.max_adverse !== null &&
          trade.max_adverse !== undefined &&
          trade.max_adverse > trade.rr
        ) {
          totalOpportunityCost += trade.max_adverse - trade.rr;
        }
      });

      // Calculate Expected Value
      // EV = (Win Rate × Average Win) - (Loss Rate × Average Loss)
      const winRateDecimal = winRate / 100;
      const lossRateDecimal = (100 - winRate) / 100;
      const expectedValue =
        winRateDecimal * averageWin - lossRateDecimal * Math.abs(averageLoss);

      // Calculate Sharpe Ratio
      // Sharpe = (Average Return) / (Standard Deviation of Returns)
      // Using RR values as returns
      let sharpeRatio = 0;
      if (rrValues.length > 1) {
        const mean = averageRR;
        const variance =
          rrValues.reduce((sum, rr) => sum + Math.pow(rr - mean, 2), 0) /
          rrValues.length;
        const stdDev = Math.sqrt(variance);
        sharpeRatio = stdDev > 0 ? mean / stdDev : 0;
      } else if (rrValues.length === 1) {
        sharpeRatio = rrValues[0] > 0 ? 999 : 0; // Single trade edge case
      }

      // Calculate Best TP RR
      // Analyze max_adverse values to suggest optimal take profit
      // Use the median or average of max_adverse values for winning trades
      const maxAdverseValues = tradesWithRR
        .filter(
          (trade) =>
            trade.max_adverse !== null &&
            trade.max_adverse !== undefined &&
            trade.max_adverse > 0
        )
        .map((trade) => trade.max_adverse!);

      let bestTPRR = 0;
      if (maxAdverseValues.length > 0) {
        // Sort and get median (more robust than average)
        const sorted = maxAdverseValues.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        bestTPRR =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
      }

      return {
        totalTrades,
        winRate,
        averageRR,
        totalRR,
        bestTrade,
        worstTrade,
        profitFactor,
        averageWin,
        averageLoss,
        maxDrawdown: maxDrawdown, // Max drawdown in RR units
        winStreak: maxWinStreak,
        loseStreak: maxLoseStreak,
        totalPnL: totalPnL,
        totalOpportunityCost,
        expectedValue,
        sharpeRatio,
        bestTPRR
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

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();
        if (authError || !user) {
          window.location.href = '/signin?next=/journal';
          return;
        }

        // Enable Supabase integration
        const { data: accounts, error: accountsError } = await supabase
          .from('trading_accounts' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (accountsError) {
          console.error('Error fetching accounts:', accountsError);
          setError(`Database error: ${accountsError.message}`);
          setAccounts([]);
        } else {
          // Calculate stats for each account
          const accountsWithStats = await Promise.all(
            (accounts || []).map(async (account: any) => {
              const stats = await calculateAccountStats(account.id);
              return {
                ...account,
                stats
              };
            })
          );
          setAccounts(accountsWithStats);
        }
      } catch (err) {
        console.error('Error in fetchAccounts:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load accounts'
        );
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [supabase]);

  const handleAccountCreated = async (account: TradingAccount) => {
    const stats = await calculateAccountStats(account.id);
    const newAccount = {
      ...account,
      stats
    };

    setAccounts((prev) => [newAccount, ...prev]);

    // Auto-select the new account if switching to individual view
    if (view === 'individual') {
      setSelectedAccount(account.id);
    }
  };

  const handleViewChange = (newView: 'individual' | 'combined') => {
    setView(newView);

    // Clear selection when switching to combined view
    if (newView === 'combined') {
      setSelectedAccount(null);
    }
  };

  const handleTradeAdded = async (trade: TradeEntry) => {
    console.log('Trade added:', trade);

    // Recalculate stats for the account that received the new trade
    const updatedStats = await calculateAccountStats(trade.account_id);

    setAccounts((prev) =>
      prev.map((account) =>
        account.id === trade.account_id
          ? { ...account, stats: updatedStats }
          : account
      )
    );

    // Trigger refresh of charts and calendar
    setRefreshKey((prev) => prev + 1);
  };

  const handleEditTrade = (trade: TradeEntry) => {
    setEditingTrade(trade);
    setIsEditTradeModalOpen(true);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this trade? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trade_entries' as any)
        .delete()
        .eq('id', tradeId);

      if (error) {
        console.error('Error deleting trade:', error);
        alert('Failed to delete trade');
        return;
      }

      // Recalculate stats for all accounts since we don't know which account the trade belonged to
      const updatedAccounts = await Promise.all(
        accounts.map(async (account) => {
          const stats = await calculateAccountStats(account.id);
          return { ...account, stats };
        })
      );
      setAccounts(updatedAccounts);
    } catch (err) {
      console.error('Error deleting trade:', err);
      alert('Failed to delete trade');
    }
  };

  const handleTradeUpdated = async (updatedTrade: TradeEntry) => {
    console.log('Trade updated:', updatedTrade);

    // Recalculate stats for the account that had the trade updated
    const updatedStats = await calculateAccountStats(updatedTrade.account_id);

    setAccounts((prev) =>
      prev.map((account) =>
        account.id === updatedTrade.account_id
          ? { ...account, stats: updatedStats }
          : account
      )
    );

    // Trigger refresh of charts and calendar
    setRefreshKey((prev) => prev + 1);

    setIsEditTradeModalOpen(false);
    setEditingTrade(null);
  };

  const selectedAccountData = selectedAccount
    ? accounts.find((a) => a.id === selectedAccount)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-400">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-400">Error: {error}</p>
            <p className="text-slate-400 mt-2 text-sm">
              Make sure the database migration has been run in Supabase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white">Trading Journal</h1>
          <div className="flex items-center flex-wrap gap-3">
            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddTradeModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-600/20"
              >
                <Plus size={18} weight="bold" />
                <span>Add Trade</span>
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                title="Settings"
              >
                <Gear size={18} weight="bold" />
              </button>
            </div>

            {/* Account Selector */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
              <AccountSelector
                accounts={accounts}
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                onAccountCreated={handleAccountCreated}
                view={view}
                onViewChange={handleViewChange}
              />
            </div>
          </div>
        </div>

        {view === 'combined' || !selectedAccount ? (
          <>
            <div className="space-y-6">
              <AccountsOverview
                accounts={accounts}
                onSelectAccount={(id) => {
                  setSelectedAccount(id);
                  setView('individual');
                }}
              />

              {/* Balance Chart - Full Width */}
              <div className="mb-6">
                <JournalBalanceChart
                  accountId={null}
                  currency={accounts.length > 0 ? accounts[0].currency : 'USD'}
                  initialBalance={accounts.reduce(
                    (sum, acc) => sum + acc.initial_balance,
                    0
                  )}
                  refreshKey={refreshKey}
                />
              </div>

              {/* Combined Stats Section */}
              <div className="mb-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {/* Total Trades */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Total Trades
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.totalTrades,
                          0
                        )}
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Win Rate
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {Math.round(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.winRate,
                            0
                          ) / Math.max(accounts.length, 1)
                        )}
                        %
                      </div>
                    </div>

                    {/* Total RR */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Total RR
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.totalRR,
                          0
                        ) >= 0
                          ? '+'
                          : ''}
                        {accounts
                          .reduce((sum, acc) => sum + acc.stats.totalRR, 0)
                          .toFixed(2)}
                        R
                      </div>
                    </div>

                    {/* Average RR */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Average RR
                      </div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.averageRR,
                          0
                        ) /
                          Math.max(accounts.length, 1) >=
                        0
                          ? '+'
                          : ''}
                        {(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.averageRR,
                            0
                          ) / Math.max(accounts.length, 1)
                        ).toFixed(2)}
                        R
                      </div>
                    </div>

                    {/* Win Streak */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Win Streak
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {Math.max(
                          ...accounts.map((acc) => acc.stats.winStreak)
                        )}
                      </div>
                    </div>

                    {/* Loss Streak */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-red-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Loss Streak
                      </div>
                      <div className="text-2xl font-bold text-red-400">
                        {Math.max(
                          ...accounts.map((acc) => acc.stats.loseStreak)
                        )}
                      </div>
                    </div>

                    {/* Profit Factor */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Profit Factor
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.profitFactor,
                            0
                          ) / Math.max(accounts.length, 1)
                        ).toFixed(2)}
                      </div>
                    </div>

                    {/* Max Drawdown */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-orange-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Max Drawdown
                      </div>
                      <div className="text-2xl font-bold text-orange-400">
                        {Math.max(
                          ...accounts.map((acc) => acc.stats.maxDrawdown)
                        ) >= 0
                          ? '+'
                          : ''}
                        {Math.max(
                          ...accounts.map((acc) => acc.stats.maxDrawdown)
                        ).toFixed(2)}
                        R
                      </div>
                    </div>

                    {/* Opportunity Cost */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Opportunity Cost
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.totalOpportunityCost,
                          0
                        ) >= 0
                          ? '+'
                          : ''}
                        {accounts
                          .reduce(
                            (sum, acc) => sum + acc.stats.totalOpportunityCost,
                            0
                          )
                          .toFixed(2)}
                        R
                      </div>
                    </div>

                    {/* Expected Value */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Expected Value
                      </div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.expectedValue,
                          0
                        ) /
                          Math.max(accounts.length, 1) >=
                        0
                          ? '+'
                          : ''}
                        {(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.expectedValue,
                            0
                          ) / Math.max(accounts.length, 1)
                        ).toFixed(2)}
                        R
                      </div>
                    </div>

                    {/* Sharpe Ratio */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Sharpe Ratio
                      </div>
                      <div className="text-2xl font-bold text-indigo-400">
                        {(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.sharpeRatio,
                            0
                          ) / Math.max(accounts.length, 1)
                        ).toFixed(2)}
                      </div>
                    </div>

                    {/* Best TP RR */}
                    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/10">
                      <div className="text-xs text-slate-400 mb-1">
                        Best TP RR
                      </div>
                      <div className="text-2xl font-bold text-pink-400">
                        {accounts.reduce(
                          (sum, acc) => sum + acc.stats.bestTPRR,
                          0
                        ) /
                          Math.max(accounts.length, 1) >=
                        0
                          ? '+'
                          : ''}
                        {(
                          accounts.reduce(
                            (sum, acc) => sum + acc.stats.bestTPRR,
                            0
                          ) / Math.max(accounts.length, 1)
                        ).toFixed(2)}
                        R
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Mode Tabs */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                  <button
                    onClick={() => setDisplayMode('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      displayMode === 'calendar'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Calendar View
                  </button>
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      displayMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Trade List
                  </button>
                </div>
              </div>

              {/* Full Width Calendar/List */}
              {displayMode === 'calendar' ? (
                <TradeCalendar
                  accountId={null}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  refreshKey={refreshKey}
                />
              ) : (
                <TradeList
                  accountId={null}
                  onEditTrade={handleEditTrade}
                  onDeleteTrade={handleDeleteTrade}
                  refreshKey={refreshKey}
                />
              )}
            </div>
          </>
        ) : selectedAccountData ? (
          <>
            {/* Balance Chart - Full Width */}
            <div className="mb-6">
              <JournalBalanceChart
                accountId={selectedAccount}
                currency={selectedAccountData.currency}
                initialBalance={selectedAccountData.initial_balance}
                refreshKey={refreshKey}
              />
            </div>

            {/* Combined Stats Section */}
            <div className="mb-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {/* Total Trades */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Total Trades
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {selectedAccountData.stats.totalTrades}
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                    <div className="text-xs text-slate-400 mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {Math.round(selectedAccountData.stats.winRate)}%
                    </div>
                  </div>

                  {/* Total RR */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                    <div className="text-xs text-slate-400 mb-1">Total RR</div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedAccountData.stats.totalRR >= 0 ? '+' : ''}
                      {selectedAccountData.stats.totalRR.toFixed(2)}R
                    </div>
                  </div>

                  {/* Average RR */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Average RR
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {selectedAccountData.stats.averageRR >= 0 ? '+' : ''}
                      {selectedAccountData.stats.averageRR.toFixed(2)}R
                    </div>
                  </div>

                  {/* Win Streak */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Win Streak
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                      {selectedAccountData.stats.winStreak}
                    </div>
                  </div>

                  {/* Loss Streak */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-red-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Loss Streak
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {selectedAccountData.stats.loseStreak}
                    </div>
                  </div>

                  {/* Profit Factor */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Profit Factor
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedAccountData.stats.profitFactor.toFixed(2)}
                    </div>
                  </div>

                  {/* Max Drawdown */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-orange-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Max Drawdown
                    </div>
                    <div className="text-2xl font-bold text-orange-400">
                      {selectedAccountData.stats.maxDrawdown >= 0 ? '+' : ''}
                      {selectedAccountData.stats.maxDrawdown.toFixed(2)}R
                    </div>
                  </div>

                  {/* Opportunity Cost */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Opportunity Cost
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {selectedAccountData.stats.totalOpportunityCost >= 0
                        ? '+'
                        : ''}
                      {selectedAccountData.stats.totalOpportunityCost.toFixed(
                        2
                      )}
                      R
                    </div>
                  </div>

                  {/* Expected Value */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Expected Value
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {selectedAccountData.stats.expectedValue >= 0 ? '+' : ''}
                      {selectedAccountData.stats.expectedValue.toFixed(2)}R
                    </div>
                  </div>

                  {/* Sharpe Ratio */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-indigo-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Sharpe Ratio
                    </div>
                    <div className="text-2xl font-bold text-indigo-400">
                      {selectedAccountData.stats.sharpeRatio.toFixed(2)}
                    </div>
                  </div>

                  {/* Best TP RR */}
                  <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-pink-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/10">
                    <div className="text-xs text-slate-400 mb-1">
                      Best TP RR
                    </div>
                    <div className="text-2xl font-bold text-pink-400">
                      {selectedAccountData.stats.bestTPRR >= 0 ? '+' : ''}
                      {selectedAccountData.stats.bestTPRR.toFixed(2)}R
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full">
              {/* Display Mode Tabs */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-slate-800/50 rounded-lg p-1 border border-slate-700">
                  <button
                    onClick={() => setDisplayMode('calendar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      displayMode === 'calendar'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Calendar View
                  </button>
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      displayMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Trade List
                  </button>
                </div>
              </div>

              {displayMode === 'calendar' ? (
                <TradeCalendar
                  accountId={selectedAccount}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  refreshKey={refreshKey}
                />
              ) : (
                <TradeList
                  accountId={selectedAccount}
                  onEditTrade={handleEditTrade}
                  onDeleteTrade={handleDeleteTrade}
                  refreshKey={refreshKey}
                />
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">
              {accounts.length === 0
                ? 'No trading accounts found. Create your first account to get started.'
                : 'Select an account to view individual stats'}
            </p>
            {accounts.length === 0 && (
              <button
                onClick={() => {
                  /* This will be handled by the Create Account button */
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Your First Account
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ImageTradeModal
        isOpen={isAddTradeModalOpen}
        onClose={() => setIsAddTradeModalOpen(false)}
        accounts={accounts.map((acc) => ({
          id: acc.id,
          name: acc.name,
          currency: acc.currency,
          initial_balance: acc.initial_balance,
          fixed_risk: acc.fixed_risk
        }))}
        onTradeAdded={handleTradeAdded}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <EditTradeModal
        isOpen={isEditTradeModalOpen}
        onClose={() => {
          setIsEditTradeModalOpen(false);
          setEditingTrade(null);
        }}
        trade={editingTrade}
        onTradeUpdated={handleTradeUpdated}
      />
    </div>
  );
}
