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
  Clock
} from 'lucide-react';

type Signal = Tables<'signals'>;

interface Props {
  signals: Signal[];
}

export default function SignalsTab({ signals: initialSignals }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'close'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter signals based on type and search term
  const filteredSignals = signals.filter((signal) => {
    const matchesFilter = filter === 'all' || signal.type === filter;
    const matchesSearch =
      signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (signal.reason &&
        signal.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const buySignals = signals.filter((signal) => signal.type === 'buy');
  const sellSignals = signals.filter((signal) => signal.type === 'sell');
  const closeSignals = signals.filter((signal) => signal.type === 'close');

  const formatTime = (timestamp: string | number) => {
    let date: Date;
    if (typeof timestamp === 'number') {
      date = new Date(timestamp * 1000);
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
      return date.toLocaleDateString();
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
      {filteredSignals.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSignals.slice(0, 12).map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      {/* Show More Button */}
      {filteredSignals.length > 12 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-full text-slate-300 hover:text-white transition-all duration-300">
            Show More Signals
          </button>
        </div>
      )}
    </div>
  );
}
