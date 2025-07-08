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
  Sparkles
} from 'lucide-react';

type Signal = Tables<'signals'>;

interface Props {
  signals: Signal[];
}

export default function SignalsTab({ signals: initialSignals }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'buy' | 'sell' | 'close'
  >('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>(
    'all'
  );
  const [filterExchange, setFilterExchange] = useState<'all' | 'bybit'>('all');
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupChannel = async () => {
      try {
        // Avoid duplicate subscriptions
        if (isSubscribed) return;
        
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
                  const existingSignal = current.find(s => s.id === newSignal.id);
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
                    signal.id === payload.new.id ? (payload.new as Signal) : signal
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

  // Calculate statistics - only count completed trades (BUY signals that are closed)
  const totalSignals = signals.length;
  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');
  const activeSignals = signals.filter((signal) => signal.status === 'active');
  const unclosedSignals = signals.filter(
    (signal) => signal.status === 'active' || signal.status === 'executed'
  );
  const completedTrades = signals.filter(
    (signal) =>
      signal.type === 'buy' &&
      signal.status === 'closed' &&
      signal.pnl_percentage !== null
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
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'sell':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'close':
        return <XCircle className="w-4 h-4 text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
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

      {/* Signals Table */}
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
              {filteredSignals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Zap className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">
                      No signals found
                    </h3>
                    <p className="text-slate-500">
                      Try adjusting your filters or wait for new signals from
                      your Pine Script strategy.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSignals.map((signal) => {
                  const isNew = isNewSignal(signal.created_at);
                  return (
                    <tr
                      key={signal.id}
                      className={`hover:bg-slate-700/30 transition-all duration-200 ${
                        isNew
                          ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getSignalIcon(signal.type)}
                          <span className="ml-2 text-sm font-medium text-white">
                            {signal.type?.toUpperCase()}
                          </span>
                          {isNew && (
                            <div className="ml-2 flex items-center space-x-1 bg-blue-500/20 border border-blue-500/30 rounded-full px-2 py-1">
                              <Sparkles className="w-3 h-3 text-blue-400" />
                              <span className="text-xs font-medium text-blue-300">
                                NEW
                              </span>
                            </div>
                          )}
                        </div>
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
                        <div className="flex items-center">
                          {getStatusIcon(signal.status)}
                          <span className="ml-2 text-sm font-medium text-white">
                            {signal.status?.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`${(signal.pnl_percentage || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {(signal.pnl_percentage || 0) >= 0 ? '+' : ''}
                          {(signal.pnl_percentage || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        <span className="capitalize">{signal.exchange}</span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatTime(signal.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
