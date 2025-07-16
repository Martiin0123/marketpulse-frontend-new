'use client';

import { useState, useEffect } from 'react';
import { Tables } from '@/types_db';
import { useAuth } from '@/utils/auth-context';
import { createClient } from '@/utils/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  X,
  Clock,
  Link,
  Unlink,
  BarChart3,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Activity,
  Bell,
  Sparkles,
  Calendar,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

type Signal = Tables<'signals'>;

interface Props {
  signals: Signal[];
}

export default function SignalsTab({ signals: initialSignals }: Props) {
  // Sort initial signals by date (latest first)
  const sortedInitialSignals = [...initialSignals].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const [signals, setSignals] = useState<Signal[]>(sortedInitialSignals);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'buy' | 'sell' | 'close'
  >('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>(
    'all'
  );
  const [filterExchange, setFilterExchange] = useState<'all' | 'bybit'>('all');
  const { user } = useAuth();
  const supabase = createClient()!;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupChannel = async () => {
      try {
        // Avoid duplicate subscriptions
        if (isSubscribed || !supabase) return;

        channel = supabase
          .channel('signals-changes-signalstab')
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
                  const newSignal = payload.new as Signal;
                  // Prevent duplicate signals
                  const existingSignal = current.find(
                    (s) => s.id === newSignal.id
                  );
                  if (existingSignal) return current;

                  const newSignals = [...current, newSignal];
                  return newSignals.sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  );
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
      if (channel && supabase) {
        supabase.removeChannel(channel);
        isSubscribed = false;
      }
    };
  }, [user?.id]); // Only depend on user ID

  // Filter signals based on search and filters
  const filteredSignals = signals.filter((signal) => {
    const matchesSearch = signal.symbol
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || signal.type === filterType;
    const matchesStatus =
      filterStatus === 'all' || signal.status === filterStatus;
    const matchesExchange =
      filterExchange === 'all' || signal.exchange === filterExchange;

    return matchesSearch && matchesType && matchesStatus && matchesExchange;
  });

  // Calculate statistics - only count completed trades (closed signals with P&L)
  const totalSignals = signals.length;
  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');
  const activeSignals = signals.filter((signal) => signal.status === 'active');
  const unclosedSignals = signals.filter(
    (signal) => signal.status === 'active' || signal.status === 'executed'
  );
  const completedTrades = signals.filter(
    (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
  );
  const winningTrades = completedTrades.filter(
    (signal) => (signal.pnl_percentage || 0) > 0
  );
  const winRate =
    completedTrades.length > 0
      ? (winningTrades.length / completedTrades.length) * 100
      : 0;
  const totalPnL = completedTrades.reduce(
    (sum, signal) => sum + (signal.pnl_percentage || 0),
    0
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString('en-US');
    }
  };

  const isNewSignal = (timestamp: string) => {
    const signalTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - signalTime) / (1000 * 60);
    return diffInMinutes < 30; // Consider signals from last 30 minutes as "new"
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'sell':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      case 'close':
        return <XCircle className="w-5 h-5 text-orange-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'sell':
        return 'border-red-500/30 bg-red-500/5';
      case 'close':
        return 'border-orange-500/30 bg-orange-500/5';
      default:
        return 'border-slate-500/30 bg-slate-500/5';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'closed':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Trading Signals Analysis
            </h2>
            {unclosedSignals.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1">
                  <div className="flex items-center space-x-1">
                    <Bell className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">
                      {unclosedSignals.length} Unclosed
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm sm:text-base text-slate-400">
            Comprehensive analysis of your Pine Script strategy signals
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                {winningTrades.length} / {completedTrades.length}
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
                Total P&L
              </p>
              <p
                className={`text-lg sm:text-xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {totalPnL >= 0 ? '+' : ''}
                {totalPnL.toFixed(2)}%
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
                Active Signals
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white">
                {activeSignals.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="close">Close</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>

            {/* Exchange Filter */}
            <select
              value={filterExchange}
              onChange={(e) => setFilterExchange(e.target.value as any)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Exchanges</option>
              <option value="bybit">Bybit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Signals Section */}
      {activeSignals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Active Signals</h3>
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
              <span className="text-xs font-medium text-emerald-300">
                {activeSignals.length} Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeSignals.map((signal) => {
              const isNew = isNewSignal(signal.created_at);

              return (
                <div
                  key={signal.id}
                  className={`relative bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 backdrop-blur-sm rounded-xl border-2 border-emerald-500/40 p-6 hover:bg-emerald-700/20 transition-all duration-200 shadow-lg shadow-emerald-500/10 ${
                    isNew
                      ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                      : ''
                  }`}
                >
                  {/* Active Signal Badge */}
                  <div className="absolute -top-2 -left-2 flex items-center space-x-1 bg-emerald-500 border border-emerald-400 rounded-full px-3 py-1">
                    <Activity className="w-3 h-3 text-emerald-300" />
                    <span className="text-xs font-bold text-emerald-200">
                      ACTIVE
                    </span>
                  </div>

                  {/* New Signal Badge */}
                  {isNew && (
                    <div className="absolute -top-2 -right-2 flex items-center space-x-1 bg-blue-500 border border-blue-400 rounded-full px-3 py-1">
                      <Sparkles className="w-3 h-3 text-blue-300" />
                      <span className="text-xs font-bold text-blue-200">
                        NEW
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getSignalIcon(signal.type)}
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {signal.symbol}
                        </h3>
                        <p className="text-sm text-emerald-300 capitalize">
                          {signal.type} Signal
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 text-xs font-medium text-emerald-300">
                      {getStatusIcon(signal.status)}
                      <span className="capitalize">{signal.status}</span>
                    </div>
                  </div>

                  {/* Price Information */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-300">
                        Entry Price
                      </span>
                      <span className="text-sm font-medium text-white">
                        ${Number(signal.entry_price).toFixed(2)}
                      </span>
                    </div>

                    {signal.exit_price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-300">
                          Exit Price
                        </span>
                        <span className="text-sm font-medium text-white">
                          ${Number(signal.exit_price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-emerald-700/30">
                    <div className="flex items-center space-x-2 text-xs text-emerald-300">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTime(signal.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-emerald-300">
                      <span className="capitalize">{signal.exchange}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Signals Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-white">All Signals</h3>
          <div className="bg-slate-500/20 border border-slate-500/30 rounded-full px-3 py-1">
            <span className="text-xs font-medium text-slate-300">
              {filteredSignals.length} Total
            </span>
          </div>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-12 text-center">
            <Zap className="mx-auto h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No signals found
            </h3>
            <p className="text-slate-500">
              Try adjusting your filters or wait for new signals from your Pine
              Script strategy.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSignals.map((signal) => {
              const isNew = isNewSignal(signal.created_at);
              const pnlValue = signal.pnl_percentage || 0;
              const isPositive = pnlValue >= 0;
              const isActive = signal.status === 'active';

              return (
                <div
                  key={signal.id}
                  className={`relative bg-slate-800/50 backdrop-blur-sm rounded-xl border ${getSignalColor(signal.type)} p-6 hover:bg-slate-700/30 transition-all duration-200 ${
                    isNew
                      ? 'ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                      : ''
                  } ${
                    isActive
                      ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                      : ''
                  }`}
                >
                  {/* Active Signal Badge */}
                  {isActive && (
                    <div className="absolute -top-2 -left-2 flex items-center space-x-1 bg-emerald-500 border border-emerald-400 rounded-full px-3 py-1">
                      <Activity className="w-3 h-3 text-emerald-300" />
                      <span className="text-xs font-bold text-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                  )}

                  {/* New Signal Badge */}
                  {isNew && (
                    <div className="absolute -top-2 -right-2 flex items-center space-x-1 bg-blue-500 border border-blue-400 rounded-full px-3 py-1">
                      <Sparkles className="w-3 h-3 text-blue-300" />
                      <span className="text-xs font-bold text-blue-200">
                        NEW
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getSignalIcon(signal.type)}
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {signal.symbol}
                        </h3>
                        <p className="text-sm text-slate-400 capitalize">
                          {signal.type} Signal
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(signal.status)}`}
                    >
                      {getStatusIcon(signal.status)}
                      <span className="capitalize">{signal.status}</span>
                    </div>
                  </div>

                  {/* Price Information */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Entry Price
                      </span>
                      <span className="text-sm font-medium text-white">
                        ${Number(signal.entry_price).toFixed(2)}
                      </span>
                    </div>

                    {signal.exit_price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          Exit Price
                        </span>
                        <span className="text-sm font-medium text-white">
                          ${Number(signal.exit_price).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* P&L Display */}
                    {signal.pnl_percentage !== null && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-sm text-slate-400">P&L</span>
                        <div className="flex items-center space-x-1">
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          )}
                          <span
                            className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {isPositive ? '+' : ''}
                            {pnlValue.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTime(signal.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-slate-400">
                      <span className="capitalize">{signal.exchange}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
