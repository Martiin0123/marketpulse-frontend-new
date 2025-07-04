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
  Settings
} from 'lucide-react';
import { Database } from '@/types_db';
import BalanceChart from '@/components/ui/Charts/BalanceChart';
import Logo from '@/components/icons/Logo';
import TabSwitcher from './TabSwitcher';
import SignalsTab from './SignalsTab';
import PositionsTab from './PositionsTab';

type Position = Tables<'positions'>;
type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;

interface Props {
  user: User;
  subscription: Subscription;
  positions: Position[];
  signals: Signal[];
}

export default function Dashboard({
  user,
  subscription,
  positions: initialPositions,
  signals: initialSignals
}: Props) {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'signals' | 'positions'
  >('overview');
  const supabase = createClient();

  // Real-time updates for positions
  useEffect(() => {
    const channel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPositions((current) => [payload.new as Position, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setPositions((current) =>
              current.map((pos) =>
                pos.id === payload.new.id ? (payload.new as Position) : pos
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

  // Calculate basic stats
  const closedPositions = positions.filter(
    (position) => position.status === 'closed'
  );
  const openPositions = positions.filter(
    (position) => position.status === 'open'
  );
  const totalPositions = positions.length;
  const recentPositions = positions.slice(0, 10);

  // Calculate win rate
  const winningTrades = closedPositions.filter(
    (position) => (position.pnl || 0) > 0
  ).length;
  const winRate =
    closedPositions.length > 0
      ? (winningTrades / closedPositions.length) * 100
      : 0;

  // Calculate total PnL
  const totalPnLPercentage = closedPositions.reduce(
    (sum, position) => sum + (position.pnl || 0),
    0
  );
  const totalPnLDollar = (totalPnLPercentage / 100) * accountSize;

  // Calculate individual position PnL
  const calculatePositionPnL = (position: Position) => {
    if (!position.pnl) return 0;
    return (position.pnl / 100) * accountSize;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <Logo
              width={250}
              height={60}
              className="h-12 w-auto mx-auto mb-4"
            />
            <p className="mt-4 text-xl text-slate-300">
              Welcome back, {user.email?.split('@')[0]}
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
              <span className="text-emerald-400 text-sm font-medium">
                {subscription.status === 'active'
                  ? 'Active Subscription'
                  : 'Trial Period'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Switcher */}
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Total Positions
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {totalPositions}
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
                      Total P&L
                    </p>
                    <p
                      className={`text-xl font-bold ${totalPnLDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      ${totalPnLDollar.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {totalPnLPercentage >= 0 ? '+' : ''}
                      {totalPnLPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Win Rate
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {winningTrades} / {closedPositions.length} trades
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-400">
                      Open Positions
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {openPositions.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Chart */}
            <div className="mt-8">
              <BalanceChart positions={positions} accountSize={accountSize} />
            </div>

            {/* Recent Positions */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Recent Trading Positions
                </h2>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm">Live Updates</span>
                </div>
              </div>

              {recentPositions.length === 0 ? (
                <div className="text-center py-16">
                  <Activity className="mx-auto h-12 w-12 text-slate-500" />
                  <h3 className="mt-4 text-lg font-medium text-slate-300">
                    No positions yet
                  </h3>
                  <p className="mt-2 text-slate-500">
                    Trading positions will appear here as they are generated.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Side
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
                            P&L ($)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Entry Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {recentPositions.map((position) => (
                          <tr
                            key={position.id}
                            className="hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {position.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  position.type === 'buy'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {position.type === 'buy' ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                )}
                                {position.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              ${Number(position.entry_price).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              {position.exit_price
                                ? `$${Number(position.exit_price).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  position.status === 'open'
                                    ? 'bg-blue-100 text-blue-800'
                                    : position.status === 'closed'
                                      ? 'bg-slate-100 text-slate-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {position.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`${
                                  (position.pnl || 0) >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {(position.pnl || 0) >= 0 ? '+' : ''}
                                {(position.pnl || 0).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`font-semibold ${
                                  calculatePositionPnL(position) >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {calculatePositionPnL(position) >= 0 ? '+' : ''}
                                ${calculatePositionPnL(position).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                              {position.entry_timestamp
                                ? new Date(
                                    position.entry_timestamp * 1000
                                  ).toLocaleDateString()
                                : (position as any).entry_time
                                  ? new Date(
                                      (position as any).entry_time
                                    ).toLocaleDateString()
                                  : position.created_at
                                    ? new Date(
                                        position.created_at
                                      ).toLocaleDateString()
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

        {activeTab === 'positions' && <PositionsTab positions={positions} />}
      </div>
    </div>
  );
}
