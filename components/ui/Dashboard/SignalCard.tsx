'use client';

import { Tables } from '@/types_db';
import { TrendingUp, TrendingDown, Clock, Target, X } from 'lucide-react';

type Signal = Tables<'signals'>;
type Position = Tables<'positions'>;

interface Props {
  signal?: Signal;
  position?: Position;
}

export default function SignalCard({ signal, position }: Props) {
  // Handle both signals and positions
  const isBuy = signal ? signal.type === 'buy' : position?.type === 'BUY';
  const isSell = signal ? signal.type === 'sell' : position?.type === 'SELL';
  const isClose = signal
    ? signal.type === 'close'
    : position?.status === 'closed';
  const riskLevel = signal?.risk || position?.risk || 1;
  const price =
    signal?.price ||
    (position?.status === 'closed'
      ? position?.exit_price
      : position?.entry_price);
  const symbol = signal?.symbol || position?.symbol;
  const timestamp =
    (signal?.timestamp || position?.status === 'closed'
      ? position?.exit_timestamp
      : position?.entry_timestamp) || Date.now() / 1000;
  const rsi = signal?.rsi || position?.rsi;
  const macd = signal?.macd || position?.macd;
  const reason = signal?.reason || position?.reason;
  const id = signal?.id || position?.id;

  const getRiskColor = (risk: number) => {
    if (risk <= 0.3) return 'text-green-400 bg-green-400/10';
    if (risk <= 0.7) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getSignalColor = () => {
    if (isClose) return 'bg-purple-500/20 text-purple-400';
    if (isBuy) return 'bg-green-500/20 text-green-400';
    return 'bg-red-500/20 text-red-400';
  };

  const getSignalTextColor = () => {
    if (isClose) return 'text-purple-400';
    if (isBuy) return 'text-green-400';
    return 'text-red-400';
  };

  const getSignalIcon = () => {
    if (isClose) return <X className="w-5 h-5" />;
    if (isBuy) return <TrendingUp className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  const getPriceLabel = () => {
    if (isClose) return 'Exit Price';
    return 'Entry Price';
  };

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

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all duration-200 hover:scale-105">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getSignalColor()}`}>
            {getSignalIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{symbol}</h3>
            <span className={`text-sm font-medium ${getSignalTextColor()}`}>
              {isClose ? 'CLOSED' : isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(riskLevel)}`}
        >
          {isClose ? 'CLOSED' : `${(riskLevel * 100).toFixed(0)}% Risk`}
        </div>
      </div>

      {/* Price and Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{getPriceLabel()}</span>
          <span className="text-white font-mono text-lg">
            ${Number(price).toFixed(2)}
          </span>
        </div>

        {rsi && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">RSI</span>
            <span className="text-white font-mono">
              {Number(rsi).toFixed(2)}
            </span>
          </div>
        )}

        {macd && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">MACD</span>
            <span className="text-white font-mono">
              {Number(macd).toFixed(4)}
            </span>
          </div>
        )}

        {reason && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-start space-x-2">
              <Target className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-gray-300 text-sm">{reason}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(timestamp)}</span>
          </div>
          <span>ID: {id}</span>
        </div>
      </div>
    </div>
  );
}
