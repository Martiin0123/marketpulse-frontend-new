'use client';

import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import SignalCard from './SignalCard';
import StatsOverview from './StatsOverview';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Calendar,
  ArrowRight,
  X,
  Settings
} from 'lucide-react';
import { Database } from '@/types_db';
import BalanceChart from '@/components/ui/Charts/BalanceChart';
import Logo from '@/components/icons/Logo';

type Position = Tables<'positions'>;
type Subscription = Tables<'subscriptions'>;

interface Props {
  user: User;
  subscription: Subscription;
  positions: Position[];
}

export default function Dashboard({
  user,
  subscription,
  positions: initialPositions
}: Props) {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [loading, setLoading] = useState(false);
  const [accountSize, setAccountSize] = useState<number>(10000); // Default $10,000
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time subscription for new positions
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
  const openPositions = positions.filter(
    (position) => position.status === 'open'
  );
  const closedPositions = positions.filter(
    (position) => position.status === 'closed'
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

  // Calculate total PnL based on account size
  const totalPnLPercentage = closedPositions.reduce(
    (sum, position) => sum + (position.pnl || 0),
    0
  );
  const totalPnLDollar = (totalPnLPercentage / 100) * accountSize;

  // Calculate PnL for individual position based on account size
  const calculatePositionPnL = (position: Position) => {
    if (!position.pnl) return 0;
    return (position.pnl / 100) * accountSize;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <Logo
              width={250}
              height={60}
              className="h-12 w-auto mx-auto mb-4"
            />
            <p className="mt-4 text-xl text-gray-300">
              Welcome back, {user.email?.split('@')[0]}
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-green-400 text-sm font-medium">
                {subscription.status === 'active'
                  ? 'Active Subscription'
                  : 'Trial Period'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Account Size Control */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Settings className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <label
                htmlFor="accountSize"
                className="text-sm font-medium text-gray-400"
              >
                Account Size
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-white text-lg">$</span>
                <input
                  id="accountSize"
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(Number(e.target.value) || 0)}
                  className="bg-gray-700 text-white rounded-lg px-3 py-2 w-32 text-lg font-semibold border border-gray-600 focus:border-purple-400 focus:outline-none"
                  min="0"
                  step="1000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Total Positions
                </p>
                <p className="text-2xl font-bold text-white">
                  {totalPositions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total P&L</p>
                <p
                  className={`text-xl font-bold ${totalPnLDollar >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  ${totalPnLDollar.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalPnLPercentage >= 0 ? '+' : ''}
                  {totalPnLPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-white">
                  {winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {winningTrades} / {closedPositions.length} trades
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Open Positions
                </p>
                <p className="text-2xl font-bold text-white">
                  {openPositions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-12 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Settings className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Account Settings
                </h3>
                <p className="text-gray-400 text-sm">
                  Configure your trading account parameters
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-gray-400 text-sm font-medium">
                Account Size:
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-32"
                  min="1000"
                  max="1000000"
                  step="1000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Balance Chart */}
        <div className="mt-8">
          <BalanceChart
            positions={positions}
            winRate={winRate.toFixed(1)}
            accountSize={accountSize}
          />
        </div>

        {/* Recent Positions */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">
              Recent Trading Positions
            </h2>
            <div className="flex items-center space-x-2 text-gray-400">
              <Activity className="w-5 h-5" />
              <span className="text-sm">Live Updates</span>
            </div>
          </div>

          {recentPositions.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-300">
                No positions yet
              </h3>
              <p className="mt-2 text-gray-500">
                Trading positions will appear here as they are generated.
              </p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Side
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Entry Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Exit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        P&L (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        P&L ($)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Entry Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {recentPositions.map((position) => (
                      <tr
                        key={position.id}
                        className="hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {position.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              position.type === 'buy'
                                ? 'bg-green-100 text-green-800'
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          ${Number(position.entry_price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
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
                                  ? 'bg-gray-100 text-gray-800'
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
                                ? 'text-green-400'
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
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {calculatePositionPnL(position) >= 0 ? '+' : ''}$
                            {calculatePositionPnL(position).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
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
      </div>
    </div>
  );
}
