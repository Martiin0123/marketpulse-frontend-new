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
  const [autoRefresh, setAutoRefresh] = useState(true);
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
    if (!confirm('Are you sure you want to clear all copy trade logs? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);

      let query = supabase
        .from('copy_trade_logs' as any)
        .delete();

      if (configId) {
        query = query.eq('copy_trade_config_id', configId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing logs:', error);
        alert('Failed to clear logs. Please try again.');
        return;
      }

      // Reload logs after clearing
      await loadLogs();
    } catch (error) {
      console.error('Error in handleClearLogs:', error);
      alert('Failed to clear logs. Please try again.');
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

  const stats = {
    total: logs.length,
    pending: logs.filter((l) => l.order_status === 'pending').length,
    submitted: logs.filter((l) => l.order_status === 'submitted').length,
    filled: logs.filter((l) => l.order_status === 'filled').length,
    cancelled: logs.filter((l) => l.order_status === 'cancelled').length,
    error: logs.filter(
      (l) =>
        l.order_status === 'error' ||
        l.order_status === 'rejected'
    ).length
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            Copy Trade Activity
          </h3>
          <p className="text-sm text-slate-400">
            Real-time execution logs and order status
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={loadLogs}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            {isClearing ? 'Clearing...' : 'Clear Logs'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">Total</div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-500">
            {stats.pending}
          </div>
          <div className="text-xs text-yellow-500/70 mt-1">Pending</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-500">
            {stats.submitted}
          </div>
          <div className="text-xs text-blue-500/70 mt-1">Submitted</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
          <div className="text-2xl font-bold text-green-500">
            {stats.filled}
          </div>
          <div className="text-xs text-green-500/70 mt-1">Filled</div>
        </div>
        <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/20">
          <div className="text-2xl font-bold text-orange-500">
            {stats.cancelled}
          </div>
          <div className="text-xs text-orange-500/70 mt-1">Cancelled</div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
          <div className="text-2xl font-bold text-red-500">{stats.error}</div>
          <div className="text-xs text-red-500/70 mt-1">Errors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
      {(['all', 'pending', 'submitted', 'filled', 'cancelled', 'error'] as const).map(
        (f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        )
      )}
      </div>

      {/* Logs List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No logs found</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`bg-slate-700/50 rounded-lg p-4 border ${getStatusColor(log.order_status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getStatusIcon(log.order_status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-white">
                        {log.source_symbol} {log.source_side.toUpperCase()}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold text-white">
                        {log.destination_symbol}{' '}
                        {log.destination_side.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {log.source_quantity} × {log.multiplier.toFixed(2)} ={' '}
                        {log.destination_quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>
                        {log.source_account?.name || 'Source'} →{' '}
                        {log.destination_account?.name || 'Destination'}
                      </span>
                      {log.order_id && (
                        <span className="text-xs">
                          Order ID: {log.order_id}
                        </span>
                      )}
                      {log.filled_price && (
                        <span className="text-green-400">
                          Filled @ {log.filled_price}
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <div className="mt-2 text-sm text-red-400">
                        Error: {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{formatTime(log.created_at)}</div>
                  {log.filled_at && (
                    <div className="text-green-400 mt-1">
                      Filled {formatTime(log.filled_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
