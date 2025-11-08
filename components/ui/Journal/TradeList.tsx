'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { TradeEntry } from '@/types/journal';

interface TradeListProps {
  accountId?: string | null;
  onEditTrade: (trade: TradeEntry) => void;
  onDeleteTrade: (tradeId: string) => void;
  className?: string;
  refreshKey?: number;
}

export default function TradeList({
  accountId,
  onEditTrade,
  onDeleteTrade,
  className = '',
  refreshKey = 0
}: TradeListProps) {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'symbol'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const supabase = createClient();

  useEffect(() => {
    fetchTrades();
  }, [accountId, refreshKey]);

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('trade_entries' as any)
        .select('*')
        .order('entry_date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching trades:', fetchError);
        setError('Failed to load trades');
        return;
      }

      setTrades(data || []);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: 'date' | 'pnl' | 'symbol') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedTrades = [...trades].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.entry_date);
        bValue = new Date(b.entry_date);
        break;
      case 'pnl':
        aValue = a.rr || 0;
        bValue = b.rr || 0;
        break;
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPnlColor = (pnl: number | null) => {
    if (pnl === null || pnl === undefined) return 'text-slate-400';
    return pnl >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getSideColor = (side: string) => {
    return side.toLowerCase() === 'long' ? 'text-green-400' : 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'open':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-400">Loading trades...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTrades}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Trade History</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              handleSort(e.target.value as 'date' | 'pnl' | 'symbol')
            }
            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
          >
            <option value="date">Date</option>
            <option value="pnl">P&L</option>
            <option value="symbol">Symbol</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <span className="text-slate-400 text-sm">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </span>
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">No trades found</p>
          <p className="text-sm text-slate-500">
            Add your first trade using the "Add Trade" button
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTrades.map((trade) => (
            <div
              key={trade.id}
              className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  {/* Date & Time */}
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium text-white">
                      {formatDate(trade.entry_date)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatTime(trade.entry_date)}
                    </div>
                  </div>

                  {/* Symbol & Side */}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {trade.symbol}
                    </div>
                    <div
                      className={`text-xs font-medium ${getSideColor(trade.side)}`}
                    >
                      {trade.side.toUpperCase()}
                    </div>
                  </div>

                  {/* RR */}
                  <div>
                    <div className="text-xs text-slate-400">RR</div>
                    <div
                      className={`text-sm font-bold ${getPnlColor(trade.rr || 0)}`}
                    >
                      {trade.rr
                        ? `${trade.rr >= 0 ? '+' : ''}${trade.rr.toFixed(2)}R`
                        : 'N/A'}
                    </div>
                    {trade.max_adverse && (
                      <div className="text-xs text-slate-400">
                        MA: {trade.max_adverse.toFixed(2)}R
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(trade.status)}`}
                    >
                      {trade.status}
                    </span>
                  </div>

                  {/* Image URL / Image Preview */}
                  {trade.image_url ? (
                    <div className="flex justify-center">
                      <a
                        href={trade.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center space-x-1"
                        title="Open image URL"
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span>View Image</span>
                      </a>
                    </div>
                  ) : trade.image_data ? (
                    <div className="flex justify-center">
                      <img
                        src={trade.image_data}
                        alt="Trade chart"
                        className="w-16 h-12 object-cover rounded border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          // Open image in full screen
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>Trade Chart - ${trade.symbol}</title></head>
                                <body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;">
                                  <img src="${trade.image_data}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                                </body>
                              </html>
                            `);
                          }
                        }}
                        title="Click to view full size"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onEditTrade(trade)}
                    className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                    title="Edit Trade"
                  >
                    <PencilIcon className="h-4 w-4 text-slate-400 hover:text-blue-400" />
                  </button>
                  <button
                    onClick={() => onDeleteTrade(trade.id)}
                    className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                    title="Delete Trade"
                  >
                    <TrashIcon className="h-4 w-4 text-slate-400 hover:text-red-400" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              {trade.notes && (
                <div className="mt-3 pt-3 border-t border-slate-600/50">
                  <div className="text-xs text-slate-400 mb-1">Notes:</div>
                  <div className="text-sm text-slate-300">{trade.notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
