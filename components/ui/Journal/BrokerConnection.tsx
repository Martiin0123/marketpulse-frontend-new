'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface BrokerConnectionProps {
  tradingAccountId: string;
  accountName: string;
  brokerType: 'tradovate' | 'projectx';
}

interface BrokerConnectionData {
  id: string;
  broker_type: string;
  broker_username: string;
  broker_account_name: string;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

const brokerNames = {
  tradovate: 'Tradovate',
  projectx: 'Project X'
};

export default function BrokerConnection({
  tradingAccountId,
  accountName,
  brokerType
}: BrokerConnectionProps) {
  const [connection, setConnection] = useState<BrokerConnectionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUsername, setApiUsername] = useState(''); // Project X: username + API key
  const [apiAccountName, setApiAccountName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadConnection();
  }, [tradingAccountId, brokerType]);

  const loadConnection = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('broker_connections' as any)
        .select('*')
        .eq('trading_account_id', tradingAccountId)
        .eq('user_id', user.id)
        .eq('broker_type', brokerType)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error loading connection:', error);
      } else if (data) {
        setConnection(data as unknown as BrokerConnectionData);
      }
    } catch (error) {
      console.error('Error loading broker connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    // For Project X, show API key form instead of OAuth
    if (brokerType === 'projectx') {
      setShowApiKeyForm(true);
      return;
    }

    // For Tradovate, use OAuth flow
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/api/broker/oauth?broker=${brokerType}&trading_account_id=${tradingAccountId}`;
      window.location.href = redirectUri;
    } catch (error: any) {
      console.error('Error connecting broker:', error);
      alert(
        `Failed to connect ${brokerNames[brokerType]} account. ${error.message || ''}`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApiKeyConnect = async () => {
    if (!apiKey || !apiUsername) {
      alert('Please enter your Username and API Key');
      return;
    }

    setIsConnecting(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create connection with API key
      const { data, error } = await supabase
        .from('broker_connections' as any)
        .insert({
          user_id: user.id,
          trading_account_id: tradingAccountId,
          broker_type: brokerType,
          auth_method: 'api_key',
          api_key: apiKey,
          api_username: apiUsername, // Project X: username + API key
          api_secret: null, // Not needed for Project X
          broker_account_name: apiAccountName || accountName,
          broker_username: apiAccountName || accountName, // Use account name as username
          auto_sync_enabled: true,
          // OAuth fields are null for API key connections
          access_token: null,
          refresh_token: null,
          token_expires_at: null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setConnection(data as unknown as BrokerConnectionData);
      }
      setShowApiKeyForm(false);
      setApiKey('');
      setApiUsername('');
      setApiAccountName('');
    } catch (error: any) {
      console.error('Error connecting with API key:', error);
      alert(
        `Failed to connect ${brokerNames[brokerType]} account: ${error.message}`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    if (
      !confirm(
        `Are you sure you want to disconnect this ${brokerNames[brokerType]} account?`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('broker_connections' as any)
        .delete()
        .eq('id', connection.id);

      if (error) {
        throw error;
      }

      setConnection(null);
    } catch (error) {
      console.error('Error disconnecting broker:', error);
      alert(`Failed to disconnect ${brokerNames[brokerType]} account`);
    }
  };

  const handleSync = async () => {
    if (!connection) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(
        `/api/broker/sync?broker_connection_id=${connection.id}`,
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
        .from('broker_connections' as any)
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
      <div className="bg-slate-700/30 rounded-lg p-2.5 border border-slate-600/50">
        <div className="animate-pulse">
          <div className="h-3 bg-slate-600 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-2.5 border border-slate-600/50">
      {!connection ? (
        <>
          {!showApiKeyForm ? (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm text-white font-medium">
                  {brokerNames[brokerType]}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  Not connected
                </span>
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">
                  Enter API Credentials
                </span>
                <button
                  onClick={() => {
                    setShowApiKeyForm(false);
                    setApiKey('');
                    setApiUsername('');
                    setApiAccountName('');
                  }}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={apiUsername}
                onChange={(e) => setApiUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key"
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={apiAccountName}
                onChange={(e) => setApiAccountName(e.target.value)}
                placeholder="Account Name (optional - for display)"
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400">
                Your API credentials are stored securely and only used to sync
                your trades.
              </p>
              <button
                onClick={handleApiKeyConnect}
                disabled={isConnecting || !apiKey || !apiUsername}
                className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-sm text-white font-medium">
                {brokerNames[brokerType]}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {connection.broker_username || connection.broker_account_name}
              </span>
              {connection.last_sync_status === 'success' && (
                <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
              )}
              {connection.last_sync_status === 'error' && (
                <XCircleIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="p-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
                title="Sync Now"
              >
                <ArrowPathIcon
                  className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
              </button>
              <label
                className="flex items-center cursor-pointer"
                title="Auto-sync"
              >
                <input
                  type="checkbox"
                  checked={connection.auto_sync_enabled}
                  onChange={(e) => toggleAutoSync(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
              </label>
              <button
                onClick={handleDisconnect}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Disconnect"
              >
                <XCircleIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {(connection.last_sync_error || syncResult) && (
            <div
              className={`rounded p-1.5 text-xs ${
                syncResult?.success
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {syncResult?.message || connection.last_sync_error}
            </div>
          )}

          {connection.last_sync_at &&
            !connection.last_sync_error &&
            !syncResult && (
              <p className="text-xs text-slate-500">
                Synced {new Date(connection.last_sync_at).toLocaleDateString()}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
