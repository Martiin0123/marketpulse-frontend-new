'use client';

import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  MessageCircle,
  BarChart3,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Database } from '@/types_db';
import BalanceChart from '@/components/ui/Charts/BalanceChart';
import Logo from '@/components/icons/Logo';
import TabSwitcher from './TabSwitcher';
import SignalsTab from './SignalsTab';
import StatsOverview from './StatsOverview';
import PerformanceGuaranteeWidget from '../PerformanceGuarantee/PerformanceGuaranteeWidget';
import VIPWhitelistWidget from './VIPWhitelistWidget';
import { useAuth } from '@/utils/auth-context';
import { AuthLoadingState } from '@/components/ui/LoadingStates/Skeleton';
import Button from '@/components/ui/Button';

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;

interface Stats {
  totalSignals: number;
  activeSignals: number;
  closedSignals: number;
  totalPnl: number;
  winRate: number;
  averagePnl: number;
}

interface Props {
  user: User;
  subscription: Subscription;
  signals: Signal[];
  stats: Stats;
}

export default function Dashboard({
  user: initialUser,
  subscription: initialSubscription,
  signals: initialSignals,
  stats
}: Props) {
  const { user: authUser, subscription: authSubscription, loading } = useAuth();
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'signals' | 'strategy-analysis' | 'performance-guarantee'
  >('overview');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const supabase = createClient();

  // Use auth context data if available, otherwise fall back to props
  const user = authUser || initialUser;
  const subscription = authSubscription || initialSubscription;

  // Check for URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const discordStatus = urlParams.get('discord');
    const error = urlParams.get('error');

    if (discordStatus === 'connected') {
      setNotification({
        type: 'success',
        message:
          'Successfully connected to Discord! You can now receive notifications and join our community.'
      });
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (error) {
      setNotification({
        type: 'error',
        message: 'Failed to connect Discord account. Please try again.'
      });
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []); // Empty dependency array - only run once

  // Real-time updates for signals - only set up once when component mounts
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupChannel = async () => {
      try {
        // Avoid duplicate subscriptions
        if (isSubscribed) return;

        channel = supabase
          .channel('signals-changes-dashboard')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'signals'
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setSignals((current) => {
                  // Prevent duplicate signals
                  const existingSignal = current.find(
                    (s) => s.id === payload.new.id
                  );
                  if (existingSignal) return current;
                  return [payload.new as Signal, ...current];
                });
              } else if (payload.eventType === 'UPDATE') {
                setSignals((current) =>
                  current.map((signal) =>
                    signal.id === payload.new.id
                      ? (payload.new as Signal)
                      : signal
                  )
                );
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isSubscribed = true;
            }
          });
      } catch (error) {
        console.error('Failed to setup real-time channel:', error);
      }
    };

    // Only setup if we have a user and no active subscription
    if (user && !isSubscribed) {
      setupChannel();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        isSubscribed = false;
      }
    };
  }, [user?.id]); // Only depend on user ID

  // Calculate signal statistics - only count completed trades (closed signals with P&L)
  const completedTrades = signals.filter(
    (signal) =>
      (signal.status === 'closed' || signal.status === 'executed') &&
      signal.pnl_percentage !== null
  );
  const activeSignals = signals.filter(
    (signal) => signal.status === 'active' || signal.status === 'executed'
  );
  const totalSignals = signals.length;
  const recentSignals = signals
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);

  // Calculate win rate from completed trades only
  const winningTrades = completedTrades.filter(
    (signal) => (signal.pnl_percentage || 0) > 0
  );
  const winRate =
    completedTrades.length > 0
      ? (winningTrades.length / completedTrades.length) * 100
      : 0;

  // Calculate total PnL from completed trades only
  const totalPnLPercentage = completedTrades.reduce(
    (sum, signal) => sum + (signal.pnl_percentage || 0),
    0
  );
  const avgPnL =
    completedTrades.length > 0
      ? totalPnLPercentage / completedTrades.length
      : 0;

  // Show loading state while auth is loading
  if (loading) {
    return <AuthLoadingState />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-6 rounded-xl shadow-xl backdrop-blur-md transition-all duration-300 border ring-1 ${
            notification.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/50 ring-emerald-500/20 text-white'
              : 'bg-red-900/90 border-red-500/50 ring-red-500/20 text-white'
          }`}
        >
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 mr-3 text-red-400" />
            )}
            <span className="text-sm font-medium flex-1">
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="pt-16 sm:pt-20 pb-8 sm:pb-12 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Trading Dashboard
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-4 sm:mb-6">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>

            {/* Discord Connection Status and VIP Whitelist */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {user?.user_metadata?.discord_user_id ? (
                <div className="flex items-center space-x-2">
                  <div className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connected to Discord
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          '/api/discord/assign-role',
                          {
                            method: 'POST'
                          }
                        );
                        if (response.ok) {
                          setNotification({
                            type: 'success',
                            message: 'Discord role assigned successfully!'
                          });
                        } else {
                          throw new Error('Failed to assign role');
                        }
                      } catch (error) {
                        setNotification({
                          type: 'error',
                          message: 'Failed to assign Discord role'
                        });
                      }
                    }}
                    variant="primary"
                    size="sm"
                    className="inline-flex items-center"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Assign Role
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => (window.location.href = '/api/auth/discord')}
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Connect Discord Account
                </Button>
              )}

              <Button
                onClick={() =>
                  window.open('https://discord.gg/N7taGVuz', '_blank')
                }
                variant="secondary"
                size="sm"
                className="inline-flex items-center"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Join Discord Community
              </Button>
              {/* VIP Whitelist Button */}
              <VIPWhitelistWidget
                user={user}
                subscription={{ ...subscription, prices: null }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Tabs */}
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-slate-400">
                      Total Signals
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {totalSignals}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeSignals.length} active
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-slate-400">
                      Win Rate
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {winningTrades.length} / {completedTrades.length}{' '}
                      completed
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-slate-400">
                      Avg P&L
                    </p>
                    <p
                      className={`text-lg sm:text-xl font-bold ${avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {avgPnL >= 0 ? '+' : ''}
                      {avgPnL.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {completedTrades.length} completed trades
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-slate-400">
                      Strategy Performance
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {totalPnLPercentage >= 0 ? '+' : ''}
                      {totalPnLPercentage.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-500">Total return</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Strategy Breakdown */} {/* Performance Chart */}
            <div className="mt-8">
              <BalanceChart signals={signals} />
            </div>
            {/* Recent Signals */}
            <div className="mt-8 sm:mt-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Recent Trading Signals
                </h2>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Live Updates</span>
                </div>
              </div>

              {recentSignals.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <Zap className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />
                  <h3 className="mt-4 text-base sm:text-lg font-medium text-slate-300">
                    No signals yet
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-500">
                    Trading signals will appear here as they are generated from
                    your Pine Script strategy.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Signal
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Exit Price
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            P&L (%)
                          </th>
                          <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Exchange
                          </th>
                          <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {recentSignals.map((signal) => (
                          <tr
                            key={signal.id}
                            className="hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  signal.type === 'buy'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : signal.type === 'sell'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {signal.type === 'buy' ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : signal.type === 'sell' ? (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                ) : (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {signal.type?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {signal.symbol}
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              ${Number(signal.entry_price).toFixed(2)}
                            </td>
                            <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              {signal.exit_price
                                ? `$${Number(signal.exit_price).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  signal.status === 'active'
                                    ? 'bg-blue-100 text-blue-800'
                                    : signal.status === 'closed'
                                      ? 'bg-slate-100 text-slate-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {signal.status === 'active' && (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {signal.status === 'closed' && (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {signal.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`${
                                  (signal.pnl_percentage || 0) >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {(signal.pnl_percentage || 0) >= 0 ? '+' : ''}
                                {(signal.pnl_percentage || 0).toFixed(2)}%
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              <span className="capitalize">
                                {signal.exchange}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              {signal.created_at
                                ? new Date(
                                    signal.created_at
                                  ).toLocaleDateString('en-US')
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'signals' && <SignalsTab signals={signals} />}

        {activeTab === 'strategy-analysis' && (
          <div className="space-y-6">
            <PerformanceGuaranteeWidget />
          </div>
        )}

        {activeTab === 'performance-guarantee' && (
          <div className="space-y-6">
            <PerformanceGuaranteeWidget />
          </div>
        )}
      </div>
    </div>
  );
}
