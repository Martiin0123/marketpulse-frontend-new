'use client';

import { useState, useEffect } from 'react';
import { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/client';
import SignalCard from './SignalCard';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  X,
  Clock,
  Link,
  Unlink
} from 'lucide-react';

type Signal = Tables<'signals'>;

interface Props {
  signals: Signal[];
}

interface SignalGroup {
  id: string;
  symbol: string;
  buySignal?: Signal;
  sellSignal?: Signal;
  isComplete: boolean;
  timeRange: string;
}

export default function SignalsTab({ signals: initialSignals }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'close'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedSignals, setGroupedSignals] = useState<SignalGroup[]>([]);
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

  // --- New grouping logic: pair buys and sells in order for each symbol ---
  useEffect(() => {
    const groups: SignalGroup[] = [];
    const signalsBySymbol: { [symbol: string]: Signal[] } = {};

    // 1. Group signals by symbol and sort by created_at
    signals.forEach((signal) => {
      if (!signalsBySymbol[signal.symbol]) signalsBySymbol[signal.symbol] = [];
      signalsBySymbol[signal.symbol].push(signal);
    });
    Object.values(signalsBySymbol).forEach((signalList) =>
      signalList.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );

    // 2. Pair buys and sells in order
    Object.entries(signalsBySymbol).forEach(([symbol, signalList]) => {
      const buys: Signal[] = [];
      const sells: Signal[] = [];
      signalList.forEach((sig) => {
        if (sig.type === 'buy') buys.push(sig);
        else if (sig.type === 'sell' || sig.type === 'close') sells.push(sig);
      });

      let i = 0;
      for (; i < Math.max(buys.length, sells.length); i++) {
        const buySignal = buys[i];
        const sellSignal = sells[i];
        groups.push({
          id: `${symbol}-${buySignal?.id || ''}-${sellSignal?.id || ''}`,
          symbol,
          buySignal,
          sellSignal,
          isComplete: !!(buySignal && sellSignal),
          timeRange:
            buySignal && sellSignal
              ? 'Complete'
              : buySignal
                ? 'Waiting for Sell'
                : 'Waiting for Buy'
        });
      }
    });
    setGroupedSignals(
      const sortedGroups = groups.sort((a, b) => {
        // Sort by most recent signal in the group
        const aTime = Math.max(
          a.buySignal ? new Date(a.buySignal.created_at).getTime() : 0,
          a.sellSignal ? new Date(a.sellSignal.created_at).getTime() : 0
        );
        const bTime = Math.max(
          b.buySignal ? new Date(b.buySignal.created_at).getTime() : 0,
          b.sellSignal ? new Date(b.sellSignal.created_at).getTime() : 0
        );
        console.log(`Group A time: ${aTime}, Group B time: ${bTime}, Difference: ${bTime - aTime}`);
        return bTime - aTime;
      });
      
      console.log('Sorted groups (most recent first):', sortedGroups);
      setGroupedSignals(sortedGroups);
  }, [signals]);

  // Filter signals based on type and search term
  const filteredGroups = groupedSignals.filter((group) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'buy' && group.buySignal) ||
      (filter === 'sell' && group.sellSignal) ||
      (filter === 'close' && group.isComplete);

    const matchesSearch = group.symbol
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');

  const formatTime = (timestamp: string | number) => {
    let date: Date;
    if (typeof timestamp === 'number') {
      // Check if it's already in milliseconds (13 digits) or seconds (10 digits)
      if (timestamp.toString().length === 13) {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp * 1000);
      }
    } else {
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
      return date.toLocaleDateString('en-US');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Trading Signals
          </h2>
          <p className="text-slate-400">
            Real-time signals and market analysis
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>{buySignals.length} Buy</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span>{sellSignals.length} Sell</span>
          </div>
          <div className="flex items-center space-x-1">
            <X className="w-4 h-4 text-purple-500" />
            <span>{closeSignals.length} Close</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search signals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-full text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-700/50">
          {[
            { id: 'all', label: 'All', count: signals.length },
            { id: 'buy', label: 'Buy', count: buySignals.length },
            { id: 'sell', label: 'Sell', count: sellSignals.length },
            { id: 'close', label: 'Close', count: closeSignals.length }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === filterOption.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>
      </div>

      {/* Signals Grid */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            No signals found
          </h3>
          <p className="text-slate-500">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Signals will appear here as they are generated'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.slice(0, 12).map((group) => (
            <div key={group.id} className="space-y-4">
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">
                    {group.symbol}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {group.isComplete ? (
                      <div className="flex items-center space-x-1 text-emerald-400">
                        <Link className="w-4 h-4" />
                        <span className="text-sm">Complete</span>
                      </div>
                    ) : group.buySignal && !group.sellSignal ? (
                      <div className="flex items-center space-x-1 text-blue-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Waiting for Sell</span>
                      </div>
                    ) : group.sellSignal && !group.buySignal ? (
                      <div className="flex items-center space-x-1 text-red-400">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm">Waiting for Buy</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-yellow-400">
                        <Unlink className="w-4 h-4" />
                        <span className="text-sm">Open</span>
                      </div>
                    )}
                    <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                      {group.timeRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.buySignal && (
                  <div className="relative">
                    <SignalCard signal={group.buySignal} />
                    {group.isComplete && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                )}
                {group.sellSignal && (
                  <div className="relative">
                    <SignalCard signal={group.sellSignal} />
                    {group.isComplete && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {filteredGroups.length > 12 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-full text-slate-300 hover:text-white transition-all duration-300">
            Show More Signals
          </button>
        </div>
      )}
    </div>
  );
}
