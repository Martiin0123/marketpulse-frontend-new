'use client';

import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import SignalCard from '@/components/ui/Dashboard/SignalCard';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Clock,
  Filter,
  Search,
  X,
  BarChart3,
  ArrowRight
} from 'lucide-react';

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;

interface Props {
  user: User | null;
  subscription: Subscription | null;
  signals: Signal[];
}

interface SignalGroup {
  symbol: string;
  signals: Signal[];
  openSignal?: Signal;
  closeSignal?: Signal;
  isComplete: boolean;
}

export default function SignalsPage({
  user,
  subscription,
  signals: initialSignals
}: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'close'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time subscription for new signals
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
            setSignals((current) => {
              const newSignal = payload.new as Signal;
              // Insert the new signal in the correct position to maintain ID-based sorting (descending)
              const newSignals = [...current, newSignal];
              return newSignals.sort((a, b) => Number(b.id) - Number(a.id));
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Group signals by symbol and pair opening/closing signals
  const groupSignals = (signals: Signal[]): SignalGroup[] => {
    const grouped = new Map<string, Signal[]>();

    // Group by symbol
    signals.forEach((signal) => {
      if (!grouped.has(signal.symbol)) {
        grouped.set(signal.symbol, []);
      }
      grouped.get(signal.symbol)!.push(signal);
    });

    // Create signal groups with pairing logic
    const signalGroups: SignalGroup[] = [];

    grouped.forEach((symbolSignals, symbol) => {
      // Sort signals by ID (newest first)
      symbolSignals.sort((a, b) => Number(b.id) - Number(a.id));

      // Find pairs of open/close signals
      const openSignals = symbolSignals.filter(
        (s) => s.type === 'buy' || s.type === 'sell'
      );
      const closeSignals = symbolSignals.filter((s) => s.type === 'close');

      // If we have both open and close signals, try to pair them
      if (openSignals.length > 0 && closeSignals.length > 0) {
        const pairs: SignalGroup[] = [];
        const usedCloseSignals = new Set<string>();

        openSignals.forEach((openSignal) => {
          // Find the most recent close signal after this open signal
          const closeSignal = closeSignals.find(
            (close) =>
              Number(close.id) > Number(openSignal.id) &&
              !usedCloseSignals.has(close.id.toString())
          );

          if (closeSignal) {
            usedCloseSignals.add(closeSignal.id.toString());
            pairs.push({
              symbol,
              signals: [openSignal, closeSignal],
              openSignal,
              closeSignal,
              isComplete: true
            });
          } else {
            // Open signal without close
            pairs.push({
              symbol,
              signals: [openSignal],
              openSignal,
              isComplete: false
            });
          }
        });

        // Add any unpaired close signals
        closeSignals.forEach((closeSignal) => {
          if (!usedCloseSignals.has(closeSignal.id.toString())) {
            pairs.push({
              symbol,
              signals: [closeSignal],
              closeSignal,
              isComplete: false
            });
          }
        });

        signalGroups.push(...pairs);
      } else {
        // No pairing possible, add individual signals
        symbolSignals.forEach((signal) => {
          signalGroups.push({
            symbol,
            signals: [signal],
            openSignal: signal.type !== 'close' ? signal : undefined,
            closeSignal: signal.type === 'close' ? signal : undefined,
            isComplete: false
          });
        });
      }
    });

    return signalGroups.sort((a, b) => {
      const aMaxId = Math.max(...a.signals.map((s) => Number(s.id)));
      const bMaxId = Math.max(...b.signals.map((s) => Number(s.id)));
      return bMaxId - aMaxId;
    });
  };

  // Filter signals based on type and search term
  const filteredSignals = signals.filter((signal) => {
    const matchesFilter = filter === 'all' || signal.type === filter;
    const matchesSearch =
      signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (signal.reason &&
        signal.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const signalGroups = groupSignals(filteredSignals);

  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');
  const totalSignals = signals.length;

  const formatTime = (timestamp: string | number) => {
    let date: Date;
    if (typeof timestamp === 'number') {
      // Unix timestamp
      date = new Date(timestamp * 1000);
    } else {
      // ISO string
      date = new Date(timestamp);
    }
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const SignalGroupCard = ({ group }: { group: SignalGroup }) => {
    const { openSignal, closeSignal, isComplete } = group;

    if (!isComplete || !openSignal || !closeSignal) {
      // Show individual signal for unclosed trades with special highlighting
      const signal = openSignal || closeSignal!;
      const isUnclosed = signal.type !== 'close' && !closeSignal;

      return (
        <div
          className={`backdrop-blur-sm rounded-xl border p-6 hover:border-gray-600 transition-all duration-200 ${
            isUnclosed
              ? 'bg-yellow-500/10 border-yellow-500/30 ring-2 ring-yellow-500/20'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          {isUnclosed && (
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 text-sm font-medium">
                OPEN POSITION
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  signal.type === 'close'
                    ? 'bg-purple-500/20 text-purple-400'
                    : signal.type === 'buy'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                }`}
              >
                {signal.type === 'close' ? (
                  <X className="w-5 h-5" />
                ) : signal.type === 'buy' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {signal.symbol}
                </h3>
                <span
                  className={`text-sm font-medium ${
                    signal.type === 'close'
                      ? 'text-purple-400'
                      : signal.type === 'buy'
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}
                >
                  {signal.type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Price and Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                {signal.type === 'close' ? 'Exit Price' : 'Entry Price'}
              </span>
              <span className="text-white font-mono text-lg">
                ${Number(signal.price).toFixed(2)}
              </span>
            </div>

            {signal.rsi && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">RSI</span>
                <span className="text-white font-mono">
                  {Number(signal.rsi).toFixed(2)}
                </span>
              </div>
            )}

            {signal.macd && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">MACD</span>
                <span className="text-white font-mono">
                  {Number(signal.macd).toFixed(4)}
                </span>
              </div>
            )}

            {signal.reason && (
              <div className="pt-2 border-t border-gray-700">
                <div className="flex items-start space-x-2">
                  <Target className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-300 text-sm">{signal.reason}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(signal.timestamp)}</span>
              </div>
              <span>ID: {signal.id}</span>
            </div>
          </div>
        </div>
      );
    }

    // Calculate PnL if both signals exist
    const entryPrice = Number(openSignal.price);
    const exitPrice = Number(closeSignal.price);
    let pnlPercentage = 0;

    if (openSignal.type === 'buy') {
      pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      pnlPercentage = ((entryPrice - exitPrice) / entryPrice) * 100;
    }

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all duration-200">
        {/* Header with symbol and PnL */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {group.symbol}
              </h3>
              <span className="text-sm text-gray-400">Complete Trade</span>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              pnlPercentage >= 0
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}
          >
            {pnlPercentage >= 0 ? '+' : ''}
            {pnlPercentage.toFixed(2)}% PnL
          </div>
        </div>

        {/* Signal Flow */}
        <div className="space-y-4">
          {/* Open Signal */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <div
              className={`p-2 rounded-lg ${openSignal.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {openSignal.type === 'buy' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${openSignal.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {openSignal.type.toUpperCase()} ENTRY
                </span>
                <span className="text-white font-mono">
                  ${entryPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {formatTime(openSignal.timestamp)}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* Close Signal */}
          <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <X className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-400">CLOSE EXIT</span>
                <span className="text-white font-mono">
                  ${exitPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {formatTime(closeSignal.timestamp)}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {openSignal.reason && (
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-start space-x-2">
                <Target className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-300 text-sm">
                  {openSignal.reason}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                Trade Duration:{' '}
                {Math.floor(
                  (Number(closeSignal.timestamp) -
                    Number(openSignal.timestamp)) /
                    60
                )}
                m
              </span>
            </div>
            <span>
              IDs: {openSignal.id} → {closeSignal.id}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Trading Signals
          </h1>
          <p className="text-gray-400 text-lg">
            Live trading signals powered by advanced AI and technical analysis
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Total Signals
                </p>
                <p className="text-2xl font-bold text-white">{totalSignals}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Buy Signals</p>
                <p className="text-2xl font-bold text-white">
                  {buySignals.length}
                </p>
                <p className="text-xs text-green-400">
                  {totalSignals > 0
                    ? ((buySignals.length / totalSignals) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Sell Signals
                </p>
                <p className="text-2xl font-bold text-white">
                  {sellSignals.length}
                </p>
                <p className="text-xs text-red-400">
                  {totalSignals > 0
                    ? ((sellSignals.length / totalSignals) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <X className="w-6 h-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">
                  Closed Positions
                </p>
                <p className="text-2xl font-bold text-white">
                  {closeSignals.length}
                </p>
                <p className="text-xs text-purple-400">
                  {totalSignals > 0
                    ? ((closeSignals.length / totalSignals) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('buy')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'buy'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setFilter('sell')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Sell
                </button>
                <button
                  onClick={() => setFilter('close')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'close'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Grouped
                </button>
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'individual'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Individual
                </button>
              </div>

              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search symbols or reasons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signals Display */}
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {viewMode === 'grouped'
              ? signalGroups.map((group, index) => (
                  <SignalGroupCard
                    key={`${group.symbol}-${index}`}
                    group={group}
                  />
                ))
              : filteredSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-12 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Signals Found
            </h3>
            <p className="text-gray-400">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'New signals will appear here when generated.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
