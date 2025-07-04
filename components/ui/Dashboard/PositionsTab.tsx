'use client';

import { Tables } from '@/types_db';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Search,
  Filter
} from 'lucide-react';

type Position = Tables<'positions'>;

interface Props {
  positions: Position[];
}

export default function PositionsTab({ positions }: Props) {
  const openPositions = positions.filter(
    (position) => position.status === 'open'
  );
  const closedPositions = positions.filter(
    (position) => position.status === 'closed'
  );

  const calculatePositionPnL = (position: Position) => {
    if (!position.pnl) return 0;
    return (position.pnl / 100) * 10000; // Assuming $10k account size
  };

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
            Trading Positions
          </h2>
          <p className="text-slate-400">Your active and closed positions</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <div className="flex items-center space-x-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span>{openPositions.length} Open</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>{closedPositions.length} Closed</span>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Open Positions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openPositions.map((position) => (
              <div
                key={position.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        position.type === 'buy'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {position.type === 'buy' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {position.symbol}
                      </h4>
                      <span
                        className={`text-sm font-medium ${
                          position.type === 'buy'
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {position.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      (position.pnl || 0) >= 0
                        ? 'text-emerald-400 bg-emerald-400/10'
                        : 'text-red-400 bg-red-400/10'
                    }`}
                  >
                    {(position.pnl || 0) >= 0 ? '+' : ''}
                    {(position.pnl || 0).toFixed(2)}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Entry Price</span>
                    <span className="text-white font-mono">
                      ${Number(position.entry_price).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">P&L</span>
                    <span
                      className={`font-mono ${
                        calculatePositionPnL(position) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {calculatePositionPnL(position) >= 0 ? '+' : ''}$
                      {calculatePositionPnL(position).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span>
                        {position.entry_timestamp
                          ? formatTime(position.entry_timestamp)
                          : 'N/A'}
                      </span>
                    </div>
                    <span>ID: {position.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Closed Positions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {closedPositions.slice(0, 9).map((position) => (
              <div
                key={position.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all duration-200 hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        position.type === 'buy'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {position.type === 'buy' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {position.symbol}
                      </h4>
                      <span className="text-sm text-slate-400">CLOSED</span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      (position.pnl || 0) >= 0
                        ? 'text-emerald-400 bg-emerald-400/10'
                        : 'text-red-400 bg-red-400/10'
                    }`}
                  >
                    {(position.pnl || 0) >= 0 ? '+' : ''}
                    {(position.pnl || 0).toFixed(2)}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Entry</span>
                    <span className="text-white font-mono">
                      ${Number(position.entry_price).toFixed(2)}
                    </span>
                  </div>

                  {position.exit_price && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Exit</span>
                      <span className="text-white font-mono">
                        ${Number(position.exit_price).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">P&L</span>
                    <span
                      className={`font-mono ${
                        calculatePositionPnL(position) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {calculatePositionPnL(position) >= 0 ? '+' : ''}$
                      {calculatePositionPnL(position).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span>
                        {position.exit_timestamp
                          ? formatTime(position.exit_timestamp)
                          : 'N/A'}
                      </span>
                    </div>
                    <span>ID: {position.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <div className="text-center py-16">
          <Activity className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            No positions yet
          </h3>
          <p className="text-slate-500">
            Trading positions will appear here as they are generated.
          </p>
        </div>
      )}
    </div>
  );
}
