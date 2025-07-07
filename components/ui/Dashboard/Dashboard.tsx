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

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;

interface Props {
  user: User;
  subscription: Subscription;
  signals: Signal[];
  stats: any;
}

export default function Dashboard({
  user,
  subscription,
  signals: initialSignals,
  stats
}: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'signals' | 'strategy-analysis' | 'performance-guarantee'
  >('overview');
  const supabase = createClient();

  // Real-time updates for signals
  useEffect(() => {
    const channel = supabase
      .channel('signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSignals((current) => [payload.new as Signal, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setSignals((current) =>
              current.map((signal) =>
                signal.id === payload.new.id ? (payload.new as Signal) : signal
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Calculate signal statistics - only count completed trades (BUY signals that are closed or executed with P&L)
  const completedTrades = signals.filter(
    (signal) =>
      signal.type === 'buy' &&
      (signal.status === 'closed' || signal.status === 'executed') &&
      signal.pnl_percentage !== null
  );
  const activeSignals = signals.filter(
    (signal) => signal.status === 'active' || signal.status === 'executed'
  );
  const totalSignals = signals.length;
  const recentSignals = signals.slice(0, 10);

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

  // Calculate strategy performance
  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');

  // Calculate exchange distribution
  const bybitSignals = signals.filter((signal) => signal.exchange === 'bybit');
  const alpacaSignals = signals.filter(
    (signal) => signal.exchange === 'alpaca'
  );

  // Calculate signal source distribution
  const pinescriptSignals = signals.filter(
    (signal) => signal.signal_source === 'pinescript'
  );
  const manualSignals = signals.filter(
    (signal) => signal.signal_source === 'manual'
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="pt-20 pb-12 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Trading Dashboard
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-6">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>

            {/* Discord Join Button */}
            <div className="flex justify-center">
              <a
                href="https://discord.gg/N7taGVuz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 group"
              >
                <MessageCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                Join Discord Community
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Total Signals
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {totalSignals}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activeSignals.length} active
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Win Rate
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {winningTrades.length} / {completedTrades.length}{' '}
                      completed
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Avg P&L
                    </p>
                    <p
                      className={`text-xl font-bold ${avgPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
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

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Strategy Performance
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {totalPnLPercentage >= 0 ? '+' : ''}
                      {totalPnLPercentage.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-500">Total return</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              {/* Signal Types */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Signal Types
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-emerald-400 mr-2" />
                      <span className="text-slate-300">Buy Signals</span>
                    </div>
                    <span className="text-white font-semibold">
                      {buySignals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TrendingDown className="w-4 h-4 text-red-400 mr-2" />
                      <span className="text-slate-300">Sell Signals</span>
                    </div>
                    <span className="text-white font-semibold">
                      {sellSignals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <XCircle className="w-4 h-4 text-orange-400 mr-2" />
                      <span className="text-slate-300">Close Signals</span>
                    </div>
                    <span className="text-white font-semibold">
                      {closeSignals.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exchange Distribution */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Exchange Distribution
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Bybit</span>
                    <span className="text-white font-semibold">
                      {bybitSignals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Alpaca</span>
                    <span className="text-white font-semibold">
                      {alpacaSignals.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal Sources */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Signal Sources
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Pine Script</span>
                    <span className="text-white font-semibold">
                      {pinescriptSignals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Manual</span>
                    <span className="text-white font-semibold">
                      {manualSignals.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="mt-8">
              <BalanceChart signals={signals} />
            </div>

            {/* Recent Signals */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Recent Trading Signals
                </h2>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm">Live Updates</span>
                </div>
              </div>

              {recentSignals.length === 0 ? (
                <div className="text-center py-16">
                  <Zap className="mx-auto h-12 w-12 text-slate-500" />
                  <h3 className="mt-4 text-lg font-medium text-slate-300">
                    No signals yet
                  </h3>
                  <p className="mt-2 text-slate-500">
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Signal
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Exit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            P&L (%)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Exchange
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
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
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {signal.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              ${Number(signal.entry_price).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              {signal.exit_price
                                ? `$${Number(signal.exit_price).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              <span className="capitalize">
                                {signal.exchange}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
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
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Strategy Performance Analysis
              </h2>
              <p className="text-slate-400">
                Detailed analysis of your Pine Script strategy performance,
                including RSI values, moving averages, and divergence patterns.
              </p>
            </div>
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
