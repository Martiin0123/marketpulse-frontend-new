'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface TradovateConnectionProps {
  tradingAccountId: string;
  accountName: string;
}

interface TradovateConnectionData {
  id: string;
  tradovate_username: string;
  tradovate_account_name: string;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

export default function TradovateConnection({
  tradingAccountId,
  accountName
}: TradovateConnectionProps) {
  const [connection, setConnection] = useState<TradovateConnectionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadConnection();
  }, [tradingAccountId]);

  const loadConnection = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('tradovate_accounts' as any)
        .select('*')
        .eq('trading_account_id', tradingAccountId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading connection:', error);
      } else {
        setConnection(data);
      }
    } catch (error) {
      console.error('Error loading Tradovate connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Redirect to OAuth flow
      const redirectUri = `${window.location.origin}/api/tradovate/oauth?trading_account_id=${tradingAccountId}`;
      window.location.href = redirectUri;
    } catch (error) {
      console.error('Error connecting Tradovate:', error);
      alert('Failed to connect Tradovate account');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    if (
      !confirm('Are you sure you want to disconnect this Tradovate account?')
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tradovate_accounts' as any)
        .delete()
        .eq('id', connection.id);

      if (error) {
        throw error;
      }

      setConnection(null);
    } catch (error) {
      console.error('Error disconnecting Tradovate:', error);
      alert('Failed to disconnect Tradovate account');
    }
  };

  const handleSync = async () => {
    if (!connection) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(
        `/api/tradovate/sync?tradovate_account_id=${connection.id}`,
        {
          method: 'POST'
        }
      );

      const result = await response.json();

      if (result.success) {
        setSyncResult({
          success: true,
          message: `Synced ${result.tradesSynced} trades successfully`
        });
        // Reload connection to get updated sync status
        await loadConnection();
      } else {
        setSyncResult({
          success: false,
          message: result.errors?.join(', ') || 'Sync failed'
        });
      }
    } catch (error) {
      console.error('Error syncing trades:', error);
      setSyncResult({
        success: false,
        message: 'Failed to sync trades'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = async (enabled: boolean) => {
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('tradovate_accounts' as any)
        .update({ auto_sync_enabled: enabled })
        .eq('id', connection.id);

      if (error) {
        throw error;
      }

      setConnection({ ...connection, auto_sync_enabled: enabled });
    } catch (error) {
      console.error('Error updating auto-sync:', error);
      alert('Failed to update auto-sync setting');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-600 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-slate-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">Tradovate Integration</h4>
          <p className="text-xs text-slate-400 mt-1">
            Connect your Tradovate account to automatically sync trades
          </p>
        </div>
      </div>

      {!connection ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Connect your Tradovate account to automatically import trades into{' '}
            <span className="text-white font-medium">{accountName}</span>.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Connect Tradovate Account'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">
                Connected as{' '}
                <span className="font-medium">
                  {connection.tradovate_username ||
                    connection.tradovate_account_name}
                </span>
              </p>
              {connection.last_sync_at && (
                <p className="text-xs text-slate-400 mt-1">
                  Last synced:{' '}
                  {new Date(connection.last_sync_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {connection.last_sync_status === 'success' && (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              )}
              {connection.last_sync_status === 'error' && (
                <XCircleIcon className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>

          {connection.last_sync_error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
              <p className="text-xs text-red-400">
                {connection.last_sync_error}
              </p>
            </div>
          )}

          {syncResult && (
            <div
              className={`rounded p-2 ${
                syncResult.success
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              <p
                className={`text-xs ${
                  syncResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {syncResult.message}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={connection.auto_sync_enabled}
                onChange={(e) => toggleAutoSync(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-sync</span>
            </label>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
