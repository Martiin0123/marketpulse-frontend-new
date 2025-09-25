'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AccountSelector from '@/components/ui/Journal/AccountSelector';
import StatsCard from '@/components/ui/Journal/StatsCard';
import TradeCalendar from '@/components/ui/Journal/TradeCalendar';
import ViewSelector from '@/components/ui/Journal/ViewSelector';
import AccountsOverview from '@/components/ui/Journal/AccountsOverview';
import type { TradingAccount, AccountStats, DailyStats } from '@/types/journal';

const mockDailyStats: DailyStats[] = [
  {
    date: '2025-09-25',
    trades: 3,
    rr: 2.5,
    wins: 2,
    losses: 1
  }
  // Add more daily stats...
];

export default function JournalPage() {
  const [accounts, setAccounts] = useState<
    (TradingAccount & { stats: AccountStats })[]
  >([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'individual' | 'combined'>('combined');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const clearStorage = () => {
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might be stale
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    };

    const fetchAccounts = async () => {
      try {
        clearStorage(); // Clear stale auth data
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          window.location.href = '/signin?next=/journal';
          return;
        }

        const { data: accounts, error: accountsError } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (accountsError) throw accountsError;

        setAccounts(
          (accounts || []).map((account) => ({
            ...account,
            stats: {
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
              loseStreak: 0
            }
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [supabase]);

  const handleAccountCreated = (account: TradingAccount) => {
    setAccounts((prev) => [
      {
        ...account,
        stats: {
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
          loseStreak: 0
        }
      },
      ...prev
    ]);
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Trading Journal</h1>
          <AccountSelector
            accounts={accounts}
            selectedAccount={selectedAccount}
            onAccountChange={setSelectedAccount}
            onAccountCreated={handleAccountCreated}
            view={view}
            onViewChange={setView}
          />
        </div>

        {view === 'combined' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Trades"
                value={accounts.reduce(
                  (sum: number, acc) => sum + acc.stats.totalTrades,
                  0
                )}
                trend="up"
                trendValue="+23"
              />
              <StatsCard
                title="Average Win Rate"
                value={`${(accounts.reduce((sum: number, acc) => sum + acc.stats.winRate, 0) / accounts.length).toFixed(1)}%`}
                trend="up"
                trendValue="+3.2%"
              />
              <StatsCard
                title="Total R"
                value={accounts
                  .reduce((sum: number, acc) => sum + acc.stats.totalRR, 0)
                  .toFixed(1)}
                trend="up"
                trendValue="+15.5"
              />
              <StatsCard
                title="Best Trade"
                value={`${Math.max(...accounts.map((acc) => acc.stats.bestTrade))}R`}
                trend="up"
                trendValue="New High"
              />
            </div>

            <div className="space-y-6">
              <AccountsOverview
                accounts={accounts}
                onSelectAccount={(id) => {
                  setSelectedAccount(id);
                  setView('individual');
                }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TradeCalendar
                    stats={mockDailyStats}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                  />
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">
                    Combined Performance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Total Accounts
                      </span>
                      <span className="text-sm text-white">
                        {accounts.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Best Account
                      </span>
                      <span className="text-sm text-green-400">
                        {
                          accounts.reduce((best, acc) =>
                            acc.stats.totalRR > best.stats.totalRR ? acc : best
                          ).name
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Average PF</span>
                      <span className="text-sm text-white">
                        {(
                          accounts.reduce(
                            (sum: number, acc) => sum + acc.stats.profitFactor,
                            0
                          ) / accounts.length
                        ).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Max Drawdown
                      </span>
                      <span className="text-sm text-orange-400">
                        {Math.max(
                          ...accounts.map((acc) => acc.stats.maxDrawdown)
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : selectedAccountData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Win Rate"
                value={`${selectedAccountData.stats.winRate}%`}
                trend="up"
                trendValue="+5.2%"
              />
              <StatsCard
                title="Average R:R"
                value={selectedAccountData.stats.averageRR.toFixed(1)}
                subtitle="per trade"
                trend="up"
                trendValue="+0.3"
              />
              <StatsCard
                title="Total R"
                value={`${selectedAccountData.stats.totalRR.toFixed(1)}R (${
                  selectedAccountData.currency
                } ${(
                  selectedAccountData.stats.totalRR *
                  selectedAccountData.initial_balance *
                  (selectedAccountData.risk_per_trade / 100)
                ).toLocaleString()})`}
                trend="up"
                trendValue="+12.5"
              />
              <StatsCard
                title="Profit Factor"
                value={selectedAccountData.stats.profitFactor.toFixed(1)}
                trend="up"
                trendValue="+0.2"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TradeCalendar
                  stats={mockDailyStats}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </div>
              <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">
                    Additional Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Total Trades
                      </span>
                      <span className="text-sm text-white">
                        {selectedAccountData.stats.totalTrades}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Best Trade</span>
                      <span className="text-sm text-green-400">
                        +{selectedAccountData.stats.bestTrade}R (
                        {selectedAccountData.currency}{' '}
                        {(
                          selectedAccountData.stats.bestTrade *
                          selectedAccountData.initial_balance *
                          (selectedAccountData.risk_per_trade / 100)
                        ).toLocaleString()}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Worst Trade
                      </span>
                      <span className="text-sm text-red-400">
                        {selectedAccountData.stats.worstTrade}R (
                        {selectedAccountData.currency}{' '}
                        {(
                          selectedAccountData.stats.worstTrade *
                          selectedAccountData.initial_balance *
                          (selectedAccountData.risk_per_trade / 100)
                        ).toLocaleString()}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Average Win
                      </span>
                      <span className="text-sm text-green-400">
                        +{selectedAccountData.stats.averageWin}R (
                        {selectedAccountData.currency}{' '}
                        {(
                          selectedAccountData.stats.averageWin *
                          selectedAccountData.initial_balance *
                          (selectedAccountData.risk_per_trade / 100)
                        ).toLocaleString()}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Average Loss
                      </span>
                      <span className="text-sm text-red-400">
                        {selectedAccountData.stats.averageLoss}R (
                        {selectedAccountData.currency}{' '}
                        {(
                          selectedAccountData.stats.averageLoss *
                          selectedAccountData.initial_balance *
                          (selectedAccountData.risk_per_trade / 100)
                        ).toLocaleString()}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Max Drawdown
                      </span>
                      <span className="text-sm text-orange-400">
                        {selectedAccountData.stats.maxDrawdown}% (
                        {selectedAccountData.currency}{' '}
                        {(
                          (selectedAccountData.stats.maxDrawdown / 100) *
                          selectedAccountData.initial_balance
                        ).toLocaleString()}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Win Streak</span>
                      <span className="text-sm text-green-400">
                        {selectedAccountData.stats.winStreak}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">
                        Lose Streak
                      </span>
                      <span className="text-sm text-red-400">
                        {selectedAccountData.stats.loseStreak}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">Select an account to view stats</p>
          </div>
        )}
      </div>
    </div>
  );
}
