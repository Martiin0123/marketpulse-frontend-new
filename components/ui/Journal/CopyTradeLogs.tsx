'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid
} from '@heroicons/react/24/solid';

interface CopyTradeLog {
  id: string;
  copy_trade_config_id: string;
  source_account_id: string;
  destination_account_id: string;
  source_symbol: string;
  source_side: string;
  source_quantity: number;
  destination_symbol: string;
  destination_side: string;
  destination_quantity: number;
  multiplier: number;
  order_id?: string;
  order_status:
    | 'pending'
    | 'submitted'
    | 'filled'
    | 'rejected'
    | 'cancelled'
    | 'error';
  order_type: string;
  order_price?: number;
  filled_quantity?: number;
  filled_price?: number;
  filled_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  source_account?: { name: string };
  destination_account?: { name: string };
}

interface CopyTradeLogsProps {
  configId?: string; // Optional: filter by specific config
  className?: string;
}

export default function CopyTradeLogs({
  configId,
  className = ''
}: CopyTradeLogsProps) {
  const [logs, setLogs] = useState<CopyTradeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'submitted' | 'filled' | 'cancelled' | 'error'
  >('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadLogs();
  }, [configId, filter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, configId, filter]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('copy_trade_logs' as any)
        .select(
          `
          *,
          source_account:trading_accounts!copy_trade_logs_source_account_id_fkey(name),
          destination_account:trading_accounts!copy_trade_logs_destination_account_id_fkey(name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (configId) {
        query = query.eq('copy_trade_config_id', configId);
      }

      if (filter !== 'all') {
        query = query.eq('order_status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading copy trade logs:', error);
        return;
      }

      setLogs((data || []) as CopyTradeLog[]);
    } catch (error) {
      console.error('Error in loadLogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (
      !confirm(
        'Are you sure you want to clear all copy trade logs? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);

      // Get current user to filter by user_id
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in to clear logs.');
        setIsClearing(false);
        return;
      }

      // Build delete query with user filter
      let query = supabase
        .from('copy_trade_logs' as any)
        .delete()
        .eq('user_id', user.id);

      // If filtering by config, add that filter too
      if (configId) {
        query = query.eq('copy_trade_config_id', configId);
      }

      const { error, count } = await query;

      if (error) {
        console.error('Error clearing logs:', error);
        alert(`Failed to clear logs: ${error.message}`);
        setIsClearing(false);
        return;
      }

      // Clear local state
      setLogs([]);

      console.log('✅ Successfully cleared copy trade logs');
    } catch (error: any) {
      console.error('Error in handleClearLogs:', error);
      alert(`Failed to clear logs: ${error.message || 'Unknown error'}`);
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'submitted':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'filled':
        return <CheckCircleIconSolid className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-orange-500" />;
      case 'rejected':
      case 'error':
        return <XCircleIconSolid className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500/30';
      case 'submitted':
        return 'border-blue-500/30';
      case 'filled':
        return 'border-green-500/30';
      case 'cancelled':
        return 'border-orange-500/30';
      case 'rejected':
      case 'error':
        return 'border-red-500/30';
      default:
        return 'border-slate-600';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) {
      return `${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  const getActionDescription = (log: CopyTradeLog): string => {
    const sourceAccount = log.source_account?.name || 'Source';
    const destAccount = log.destination_account?.name || 'Destination';
    const symbol = log.source_symbol;
    const side = log.source_side.toUpperCase();
    const quantity = log.destination_quantity;

    // Check if order was modified (updated_at is significantly different from created_at)
    const createdTime = new Date(log.created_at).getTime();
    const updatedTime = new Date(log.updated_at).getTime();
    const wasModified = updatedTime - createdTime > 5000; // More than 5 seconds difference

    switch (log.order_status) {
      case 'pending':
        return `Opening ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      case 'submitted':
        return `Submitted ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      case 'filled':
        if (wasModified) {
          return `Filled ${side} order for ${quantity} ${symbol} on ${destAccount} (was modified)`;
        }
        return `Filled ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      case 'cancelled':
        return `Cancelled ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      case 'rejected':
        return `Rejected ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      case 'error':
        return `Error executing ${side} order for ${quantity} ${symbol} on ${destAccount}`;
      default:
        return `${side} order for ${quantity} ${symbol} on ${destAccount}`;
    }
  };

  const stats = {
    total: logs.length,
    pending: logs.filter((l) => l.order_status === 'pending').length,
    submitted: logs.filter((l) => l.order_status === 'submitted').length,
    filled: logs.filter((l) => l.order_status === 'filled').length,
    cancelled: logs.filter((l) => l.order_status === 'cancelled').length,
    error: logs.filter(
      (l) => l.order_status === 'error' || l.order_status === 'rejected'
    ).length
  };

  return (
    <div
      className={`bg-slate-800/50 rounded-xl border border-slate-700 ${className}`}
    >
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">
              Recent Activity
            </h3>
            {/* Compact Stats */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">
                <span className="text-white font-medium">{stats.total}</span>{' '}
                total
              </span>
              <span className="text-green-400">
                <span className="font-medium">{stats.filled}</span> filled
              </span>
              <span className="text-yellow-400">
                <span className="font-medium">{stats.pending}</span> pending
              </span>
              {stats.error > 0 && (
                <span className="text-red-400">
                  <span className="font-medium">{stats.error}</span> errors
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded w-3.5 h-3.5"
              />
              <span>Auto-refresh</span>
            </label>
            {/* Compact Filters */}
            <div className="flex gap-1">
              {(['all', 'filled', 'pending', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={loadLogs}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleClearLogs}
              disabled={isClearing || logs.length === 0}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              title="Clear all logs"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Table View */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No activity yet
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-700/30">
              <tr className="text-left text-xs text-slate-400">
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Symbol</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-700/30 transition-colors ${
                    log.order_status === 'filled'
                      ? 'bg-green-500/5'
                      : log.order_status === 'error' ||
                          log.order_status === 'rejected'
                        ? 'bg-red-500/5'
                        : log.order_status === 'cancelled'
                          ? 'bg-orange-500/5'
                          : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getStatusIcon(log.order_status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">
                          {getActionDescription(log)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          From {log.source_account?.name || 'Source'} →{' '}
                          {log.destination_account?.name || 'Destination'}
                        </div>
                        {log.error_message && (
                          <div
                            className="text-xs text-red-400 mt-1"
                            title={log.error_message}
                          >
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm text-white font-medium">
                      {log.source_symbol}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        log.source_side.toUpperCase() === 'BUY' ||
                        log.source_side.toUpperCase() === 'LONG'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {log.source_side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm text-white font-medium">
                      {log.destination_quantity}
                    </div>
                    <div className="text-xs text-slate-400">
                      {log.source_quantity} × {log.multiplier.toFixed(1)}x
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {log.filled_price ? (
                      <span className="text-sm text-green-400 font-medium">
                        {log.filled_price}
                      </span>
                    ) : log.order_price ? (
                      <span className="text-sm text-slate-300">
                        {log.order_price}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                    {log.order_type && log.order_type !== 'Market' && (
                      <div className="text-xs text-slate-400 mt-1">
                        {log.order_type}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-400">
                      {formatTime(log.created_at)}
                    </div>
                    {log.filled_at && log.filled_at !== log.created_at && (
                      <div className="text-xs text-green-400 mt-1">
                        Filled {formatTime(log.filled_at)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
