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
import PerformanceAnalysis from '@/components/ui/Journal/PerformanceAnalysis';
import SymbolPerformance from '@/components/ui/Journal/SymbolPerformance';
import CSVImportExport from '@/components/ui/Journal/CSVImportExport';
import JournalSidebar from '@/components/ui/Journal/JournalSidebar';
import JournalSettings from '@/components/ui/Journal/JournalSettings';
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
  const [currentSection, setCurrentSection] = useState<
    'overview' | 'performance' | 'trades' | 'calendar' | 'settings'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchDate, setSearchDate] = useState('');

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

  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    if (
      !confirm(
        `Are you sure you want to delete "${account.name}"? This will also delete all trades associated with this account. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trading_accounts' as any)
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
        return;
      }

      // Remove account from state
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));

      // If the deleted account was selected, clear selection
      if (selectedAccount === accountId) {
        setSelectedAccount(null);
        setView('combined');
      }

      // Trigger refresh
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
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
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar */}
      <JournalSidebar
        currentSection={currentSection}
        onSectionChange={(section) => setCurrentSection(section as any)}
      />

      {/* Main Content */}
      <div className="ml-[calc(16rem+3rem)] mr-6 flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-20 z-30 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-xl px-6 py-4 mt-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <AccountSelector
                accounts={accounts}
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                onAccountCreated={handleAccountCreated}
                onAccountDeleted={handleDeleteAccount}
                view={view}
                onViewChange={handleViewChange}
              />
            </div>
            <div className="flex items-center gap-2">
              {currentSection === 'trades' && (
                <button
                  onClick={() => setIsAddTradeModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30"
                >
                  <Plus size={18} weight="bold" />
                  <span>Add Trade</span>
                </button>
              )}
              {currentSection === 'trades' && (
                <CSVImportExport
                  accountId={selectedAccount}
                  accounts={accounts.map((acc) => ({
                    id: acc.id,
                    name: acc.name
                  }))}
                  onTradesImported={() => setRefreshKey((prev) => prev + 1)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl">
            {/* Section Content */}
            {currentSection === 'overview' && (
              <OverviewSection
                accounts={accounts}
                selectedAccount={selectedAccount}
                selectedAccountData={selectedAccountData}
                view={view}
                refreshKey={refreshKey}
                onAccountSelect={(id: string) => {
                  setSelectedAccount(id);
                  setView('individual');
                }}
                onDeleteAccount={handleDeleteAccount}
              />
            )}

            {currentSection === 'performance' && (
              <PerformanceSection
                accountId={selectedAccount}
                refreshKey={refreshKey}
              />
            )}

            {currentSection === 'trades' && (
              <TradesSection
                accountId={selectedAccount}
                searchDate={searchDate}
                onSearchDateChange={setSearchDate}
                onEditTrade={handleEditTrade}
                onDeleteTrade={handleDeleteTrade}
                refreshKey={refreshKey}
              />
            )}

            {currentSection === 'calendar' && (
              <CalendarSection
                accountId={selectedAccount}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                refreshKey={refreshKey}
              />
            )}

            {currentSection === 'settings' && (
              <JournalSettings
                accounts={accounts}
                onAccountDeleted={handleDeleteAccount}
                onAccountCreated={handleAccountCreated}
              />
            )}
          </div>
        </div>
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

// Overview Section Component
function OverviewSection({
  accounts,
  selectedAccount,
  selectedAccountData,
  view,
  refreshKey,
  onAccountSelect,
  onDeleteAccount
}: {
  accounts: any[];
  selectedAccount: string | null;
  selectedAccountData: any;
  view: string;
  refreshKey: number;
  onAccountSelect: (id: string) => void;
  onDeleteAccount: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <AccountsOverview
        accounts={accounts}
        onSelectAccount={onAccountSelect}
        onDeleteAccount={onDeleteAccount}
      />

      <JournalBalanceChart
        accountId={selectedAccount}
        currency={
          selectedAccountData?.currency || accounts[0]?.currency || 'USD'
        }
        initialBalance={
          selectedAccountData?.initial_balance ||
          accounts.reduce(
            (sum: number, acc: any) => sum + acc.initial_balance,
            0
          )
        }
        refreshKey={refreshKey}
      />

      {/* Stats Grid */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {selectedAccountData ? (
            <>
              <StatCard
                label="Total Trades"
                value={selectedAccountData.stats.totalTrades}
                color="white"
              />
              <StatCard
                label="Win Rate"
                value={`${Math.round(selectedAccountData.stats.winRate)}%`}
                color="emerald"
              />
              <StatCard
                label="Total RR"
                value={`${selectedAccountData.stats.totalRR >= 0 ? '+' : ''}${selectedAccountData.stats.totalRR.toFixed(2)}R`}
                color="green"
              />
              <StatCard
                label="Average RR"
                value={`${selectedAccountData.stats.averageRR >= 0 ? '+' : ''}${selectedAccountData.stats.averageRR.toFixed(2)}R`}
                color="cyan"
              />
              <StatCard
                label="Win Streak"
                value={selectedAccountData.stats.winStreak}
                color="purple"
              />
              <StatCard
                label="Loss Streak"
                value={selectedAccountData.stats.loseStreak}
                color="red"
              />
            </>
          ) : (
            <>
              <StatCard
                label="Total Trades"
                value={accounts.reduce(
                  (sum: number, acc: any) => sum + acc.stats.totalTrades,
                  0
                )}
                color="white"
              />
              <StatCard
                label="Win Rate"
                value={`${Math.round(accounts.reduce((sum: number, acc: any) => sum + acc.stats.winRate, 0) / Math.max(accounts.length, 1))}%`}
                color="emerald"
              />
              <StatCard
                label="Total RR"
                value={`${accounts.reduce((sum: number, acc: any) => sum + acc.stats.totalRR, 0) >= 0 ? '+' : ''}${accounts.reduce((sum: number, acc: any) => sum + acc.stats.totalRR, 0).toFixed(2)}R`}
                color="green"
              />
              <StatCard
                label="Average RR"
                value={`${accounts.reduce((sum: number, acc: any) => sum + acc.stats.averageRR, 0) / Math.max(accounts.length, 1) >= 0 ? '+' : ''}${(accounts.reduce((sum: number, acc: any) => sum + acc.stats.averageRR, 0) / Math.max(accounts.length, 1)).toFixed(2)}R`}
                color="cyan"
              />
              <StatCard
                label="Win Streak"
                value={Math.max(
                  ...accounts.map((acc: any) => acc.stats.winStreak)
                )}
                color="purple"
              />
              <StatCard
                label="Loss Streak"
                value={Math.max(
                  ...accounts.map((acc: any) => acc.stats.loseStreak)
                )}
                color="red"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Performance Section Component
function PerformanceSection({
  accountId,
  refreshKey
}: {
  accountId: string | null;
  refreshKey: number;
}) {
  return (
    <div className="space-y-6">
      <PerformanceAnalysis accountId={accountId} refreshKey={refreshKey} />
      <SymbolPerformance accountId={accountId} refreshKey={refreshKey} />
    </div>
  );
}

// Trades Section Component
function TradesSection({
  accountId,
  searchDate,
  onSearchDateChange,
  onEditTrade,
  onDeleteTrade,
  refreshKey
}: {
  accountId: string | null;
  searchDate: string;
  onSearchDateChange: (date: string) => void;
  onEditTrade: (trade: TradeEntry) => void;
  onDeleteTrade: (id: string) => void;
  refreshKey: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Trade List</h2>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={searchDate}
            onChange={(e) => onSearchDateChange(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by date..."
          />
          {searchDate && (
            <button
              onClick={() => onSearchDateChange('')}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <TradeList
        accountId={accountId}
        onEditTrade={onEditTrade}
        onDeleteTrade={onDeleteTrade}
        refreshKey={refreshKey}
        searchDate={searchDate}
      />
    </div>
  );
}

// Calendar Section Component
function CalendarSection({
  accountId,
  currentMonth,
  onMonthChange,
  refreshKey
}: {
  accountId: string | null;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  refreshKey: number;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Trade Calendar</h2>
      <TradeCalendar
        accountId={accountId}
        month={currentMonth}
        onMonthChange={onMonthChange}
        refreshKey={refreshKey}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    emerald: 'text-emerald-400',
    green: 'text-green-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    indigo: 'text-indigo-400',
    pink: 'text-pink-400'
  };

  return (
    <div className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${colorClasses[color] || 'text-white'}`}
      >
        {value}
      </div>
    </div>
  );
}
