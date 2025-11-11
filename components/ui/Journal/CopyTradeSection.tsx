'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import type { TradingAccount } from '@/types/journal';
import CopyTradeLogs from './CopyTradeLogs';
import CopyTradeAccounts from './CopyTradeAccounts';
import {
  ProjectXSignalRClient,
  ProjectXOrderUpdate,
  ProjectXTradeUpdate
} from '@/utils/projectx/signalr-client';

interface CopyTradeConfig {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  multiplier: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  source_account?: TradingAccount;
  destination_account?: TradingAccount;
}

interface CopyTradeSectionProps {
  accounts: (TradingAccount & { stats: any })[];
  refreshKey?: number;
}

export default function CopyTradeSection({
  accounts,
  refreshKey = 0
}: CopyTradeSectionProps) {
  const [configs, setConfigs] = useState<CopyTradeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CopyTradeConfig | null>(
    null
  );
  const [formData, setFormData] = useState({
    source_account_id: '',
    destination_account_id: '',
    multiplier: '1.0'
  });
  const [error, setError] = useState<string | null>(null);
  const [configStats, setConfigStats] = useState<
    Record<
      string,
      {
        sourceStats: {
          stats: any;
          todayPnL: { openPnL: number; realizedPnL: number };
          initialBalance: number;
        };
        destStats: {
          stats: any;
          todayPnL: { openPnL: number; realizedPnL: number };
          initialBalance: number;
        };
      }
    >
  >({});
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    state?: string;
    activeConnections: number;
  }>({
    connected: false,
    state: 'Disconnected',
    activeConnections: 0
  });
  const [configConnectionStatus, setConfigConnectionStatus] = useState<
    Record<string, { connected: boolean; state: string }>
  >({});

  const supabase = createClient();

  useEffect(() => {
    loadConfigs();
  }, [refreshKey]);

  // Load stats for both source and destination accounts
  useEffect(() => {
    if (configs.length === 0) return;

    const loadStats = async () => {
      const statsMap: Record<
        string,
        {
          sourceStats: {
            stats: any;
            todayPnL: { openPnL: number; realizedPnL: number };
            initialBalance: number;
          };
          destStats: {
            stats: any;
            todayPnL: { openPnL: number; realizedPnL: number };
            initialBalance: number;
          };
        }
      > = {};

      for (const config of configs) {
        const sourceAccount = accounts.find(
          (acc) => acc.id === config.source_account_id
        );
        const destAccount = accounts.find(
          (acc) => acc.id === config.destination_account_id
        );

        try {
          // Calculate stats for source account
          const sourceStats = await calculateAccountStats(
            config.source_account_id
          );
          const sourceTodayPnL = await calculateTodayPnL(
            config.source_account_id
          );

          // Calculate stats for destination account
          const destStats = await calculateAccountStats(
            config.destination_account_id
          );
          const destTodayPnL = await calculateTodayPnL(
            config.destination_account_id
          );

          statsMap[config.id] = {
            sourceStats: {
              stats: sourceStats,
              todayPnL: sourceTodayPnL,
              initialBalance: sourceAccount?.initial_balance || 0
            },
            destStats: {
              stats: destStats,
              todayPnL: destTodayPnL,
              initialBalance: destAccount?.initial_balance || 0
            }
          };
        } catch (error) {
          console.error(`Error loading stats for config ${config.id}:`, error);
        }
      }

      setConfigStats(statsMap);
    };

    loadStats();
  }, [configs, accounts, refreshKey]);

  // Real-time monitoring: Use SignalR WebSocket for instant order updates
  const signalRClientsRef = useRef<Map<string, ProjectXSignalRClient>>(
    new Map()
  );

  useEffect(() => {
    // Only connect if there are active configs
    const activeConfigs = configs.filter((c) => c.enabled);
    if (activeConfigs.length === 0) {
      // Disconnect all clients
      signalRClientsRef.current.forEach((client) => {
        client.disconnect();
      });
      signalRClientsRef.current.clear();
      setConnectionStatus({
        connected: false,
        state: 'Disconnected',
        activeConnections: 0
      });
      return;
    }

    // Fetch SignalR connection details
    const setupSignalRConnections = async () => {
      try {
        const response = await fetch('/api/copy-trade/signalr-connection');
        if (!response.ok) {
          console.warn('⚠️ Failed to get SignalR connection details');
          return;
        }

        const data = await response.json();
        const connections = data.connections || [];

        if (connections.length === 0) {
          return;
        }

        // Set up SignalR client for each connection
        for (const conn of connections) {
          const connectionKey = `${conn.connectionId}-${conn.accountId}-${conn.tradingAccountId}`;

          // Skip if already connected
          if (signalRClientsRef.current.has(connectionKey)) {
            continue;
          }

          try {
            const signalRClient = new ProjectXSignalRClient(
              conn.jwtToken,
              conn.accountId,
              conn.hubUrl
            );

            // Handle order updates (new orders, modifications, cancellations)
            signalRClient.onOrderUpdate(async (order: ProjectXOrderUpdate) => {
              // Status: 0=None, 1=Open, 2=Filled, 3=Cancelled, 4=Expired, 5=Rejected, 6=Pending
              // Order Types: 1=Limit, 2=Market, 4=Stop, 5=TrailingStop
              // Note: Stop Loss (SL) orders are typically type 4 (Stop)
              // Take Profit (TP) orders are typically type 1 (Limit) in opposite direction

              // Process new/open orders (status 1=Open, 6=Pending) AND filled orders (status 2=Filled)
              // This includes entry orders, stop loss (SL), and take profit (TP) orders
              // Filled orders need to be copied immediately
              if (
                order.status === 1 ||
                order.status === 6 ||
                order.status === 2
              ) {
                try {
                  const response = await fetch(
                    '/api/copy-trade/process-order-update',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        connectionId: conn.connectionId,
                        tradingAccountId: conn.tradingAccountId,
                        order: {
                          id: order.id.toString(),
                          symbol: order.contractId,
                          side: order.side === 0 ? 'BUY' : 'SELL',
                          quantity: order.size,
                          orderType:
                            order.type === 1
                              ? 'Limit'
                              : order.type === 2
                                ? 'Market'
                                : order.type === 4
                                  ? 'Stop'
                                  : 'Market', // Default to Market for unknown types
                          // For stop orders, the trigger price is in stopPrice, not limitPrice
                          price:
                            order.type === 4
                              ? order.stopPrice
                              : order.limitPrice,
                          stopPrice: order.stopPrice,
                          status: order.status
                        },
                        action: 'new_or_modified' // Could be new order or modified order
                      })
                    }
                  );

                  if (!response.ok) {
                    console.error('❌ Failed to process order update');
                  }
                } catch (error) {
                  console.error('❌ Error processing order update:', error);
                }
              }

              // Handle cancelled orders (status 3=Cancelled)
              if (order.status === 3) {
                try {
                  const response = await fetch(
                    '/api/copy-trade/process-order-update',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        connectionId: conn.connectionId,
                        tradingAccountId: conn.tradingAccountId,
                        order: {
                          id: order.id.toString()
                        },
                        action: 'cancelled'
                      })
                    }
                  );

                  if (!response.ok) {
                    console.error('❌ Failed to process order cancellation');
                  }
                } catch (error) {
                  console.error(
                    '❌ Error processing order cancellation:',
                    error
                  );
                }
              }
            });

            // Handle trade updates (executed trades)
            signalRClient.onTradeUpdate(async (trade: ProjectXTradeUpdate) => {
              // Process executed trades immediately
              try {
                const response = await fetch(
                  '/api/copy-trade/process-order-update',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      connectionId: conn.connectionId,
                      tradingAccountId: conn.tradingAccountId,
                      order: {
                        id:
                          trade.id?.toString() ||
                          trade.orderId?.toString() ||
                          '',
                        symbol: trade.contractId,
                        side: trade.side === 0 ? 'BUY' : 'SELL',
                        quantity: trade.size,
                        orderType: 'Market', // Trades are typically market orders
                        price: trade.price,
                        status: 2 // Filled
                      },
                      action: 'new_or_modified'
                    })
                  }
                );

                if (!response.ok) {
                  console.error('❌ Failed to process trade update');
                }
              } catch (error) {
                console.error('❌ Error processing trade update:', error);
              }
            });

            // Connect to SignalR
            await signalRClient.connect();
            signalRClientsRef.current.set(connectionKey, signalRClient);

            // Update connection status after connecting
            updateConnectionStatus();
          } catch (error: any) {
            console.error(
              `❌ Error setting up SignalR for ${connectionKey}:`,
              error
            );
            updateConnectionStatus();
          }
        }
      } catch (error) {
        console.error('❌ Error setting up SignalR connections:', error);
        updateConnectionStatus();
      }
    };

    // Function to update connection status
    const updateConnectionStatus = () => {
      const clients = Array.from(signalRClientsRef.current.values());
      const statuses = clients.map((client) => client.getConnectionStatus());
      const connectedCount = statuses.filter((s) => s.connected).length;
      const allConnected =
        connectedCount === clients.length && clients.length > 0;
      const anyConnecting = statuses.some(
        (s) => s.state === 'Connecting' || s.state === 'Reconnecting'
      );

      setConnectionStatus({
        connected: allConnected,
        state: allConnected
          ? 'Connected'
          : anyConnecting
            ? 'Connecting'
            : clients.length > 0
              ? 'Disconnected'
              : 'No Active Configs',
        activeConnections: connectedCount
      });
    };

    setupSignalRConnections().catch((error) => {
      console.error('❌ Error in setupSignalRConnections:', error);
      updateConnectionStatus();
    });

    // Set up periodic status check
    const statusInterval = setInterval(() => {
      updateConnectionStatus();
    }, 3000); // Check every 3 seconds

    // Cleanup: disconnect all SignalR clients on unmount or when configs change
    return () => {
      clearInterval(statusInterval);
      signalRClientsRef.current.forEach((client) => {
        client.disconnect();
      });
      signalRClientsRef.current.clear();
    };
  }, [configs]);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load copy trade configurations
      const { data, error: fetchError } = await supabase
        .from('copy_trade_configs' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Table might not exist yet - that's okay for now
        console.log(
          'Copy trade configs table not found, will create on first use'
        );
        setConfigs([]);
        return;
      }

      if (data) {
        setConfigs(data as unknown as CopyTradeConfig[]);
      }
    } catch (err) {
      console.error('Error loading copy trade configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.source_account_id || !formData.destination_account_id) {
      setError('Please select both source and destination accounts');
      return;
    }

    if (formData.source_account_id === formData.destination_account_id) {
      setError('Source and destination accounts must be different');
      return;
    }

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const multiplier = parseFloat(formData.multiplier) || 1.0;

      if (editingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('copy_trade_configs' as any)
          .update({
            source_account_id: formData.source_account_id,
            destination_account_id: formData.destination_account_id,
            multiplier: multiplier,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingConfig.id);

        if (updateError) throw updateError;
      } else {
        // Create new config
        const { error: insertError } = await supabase
          .from('copy_trade_configs' as any)
          .insert({
            user_id: user.id,
            source_account_id: formData.source_account_id,
            destination_account_id: formData.destination_account_id,
            multiplier: multiplier,
            enabled: true
          });

        if (insertError) {
          // If table doesn't exist, we'll need to create it first
          // For now, just show a message
          if (
            insertError.message.includes('relation') &&
            insertError.message.includes('does not exist')
          ) {
            setError(
              'Copy trade feature is being set up. Please check back soon.'
            );
            return;
          }
          throw insertError;
        }
      }

      await loadConfigs();
      setIsModalOpen(false);
      setFormData({
        source_account_id: '',
        destination_account_id: '',
        multiplier: '1.0'
      });
      setEditingConfig(null);
    } catch (err: any) {
      console.error('Error saving copy trade config:', err);
      setError(err.message || 'Failed to save configuration');
    }
  };

  const calculateAccountStats = async (accountId: string) => {
    try {
      const { data: trades, error } = await supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'closed');

      if (error || !trades || trades.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          totalRR: 0,
          totalPnL: 0
        };
      }

      const tradesWithData = trades.filter(
        (trade: any) =>
          (trade.rr !== null && trade.rr !== undefined) ||
          (trade.pnl_amount !== null && trade.pnl_amount !== undefined)
      );

      if (tradesWithData.length === 0) {
        return {
          totalTrades: 0,
          winRate: 0,
          totalRR: 0,
          totalPnL: 0
        };
      }

      const totalTrades = tradesWithData.length;
      const wins = tradesWithData.filter(
        (trade: any) =>
          (trade.rr !== null && trade.rr !== undefined && trade.rr > 0) ||
          (trade.rr === null &&
            trade.pnl_amount !== null &&
            trade.pnl_amount > 0)
      );
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      const pnlValues = tradesWithData
        .map((trade: any) => trade.pnl_amount || 0)
        .filter((pnl: any) => pnl !== null && pnl !== undefined);
      const totalPnL =
        pnlValues.length > 0
          ? pnlValues.reduce((sum: number, pnl: number) => sum + pnl, 0)
          : 0;

      const rrValues = tradesWithData
        .map((trade: any) => trade.rr || 0)
        .filter((rr: any) => rr !== null && rr !== undefined);
      const totalRR =
        rrValues.length > 0
          ? rrValues.reduce((sum: number, rr: number) => sum + rr, 0)
          : 0;

      return {
        totalTrades,
        winRate,
        totalRR,
        totalPnL
      };
    } catch (error) {
      console.error('Error calculating account stats:', error);
      return {
        totalTrades: 0,
        winRate: 0,
        totalRR: 0,
        totalPnL: 0
      };
    }
  };

  const calculateTodayPnL = async (accountId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndStr = todayEnd.toISOString();

      // Get open positions
      const { data: openTrades } = await supabase
        .from('trade_entries' as any)
        .select('entry_price, exit_price, side, size, pnl_amount')
        .eq('account_id', accountId)
        .eq('status', 'open');

      let openPnL = 0;
      if (openTrades) {
        openPnL = openTrades.reduce((sum: number, trade: any) => {
          if (trade.pnl_amount !== null && trade.pnl_amount !== undefined) {
            return sum + trade.pnl_amount;
          }
          if (trade.exit_price && trade.entry_price && trade.size) {
            const priceDiff =
              trade.side === 'long'
                ? trade.exit_price - trade.entry_price
                : trade.entry_price - trade.exit_price;
            return sum + priceDiff * trade.size;
          }
          return sum;
        }, 0);
      }

      // Get closed trades from today
      const { data: closedTrades } = await supabase
        .from('trade_entries' as any)
        .select('pnl_amount')
        .eq('account_id', accountId)
        .eq('status', 'closed')
        .gte('exit_date', todayStart)
        .lte('exit_date', todayEndStr);

      const realizedPnL = closedTrades
        ? closedTrades.reduce(
            (sum: number, trade: any) => sum + (trade.pnl_amount || 0),
            0
          )
        : 0;

      return { openPnL, realizedPnL };
    } catch (error) {
      console.error('Error calculating today PnL:', error);
      return { openPnL: 0, realizedPnL: 0 };
    }
  };

  const handleDelete = async (configId: string) => {
    if (
      !confirm('Are you sure you want to delete this copy trade configuration?')
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('copy_trade_configs' as any)
        .delete()
        .eq('id', configId);

      if (error) throw error;
      await loadConfigs();
    } catch (err: any) {
      console.error('Error deleting config:', err);
      alert('Failed to delete configuration');
    }
  };

  const handleToggleEnabled = async (config: CopyTradeConfig) => {
    try {
      const { error } = await supabase
        .from('copy_trade_configs' as any)
        .update({
          enabled: !config.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;
      await loadConfigs();
    } catch (err: any) {
      console.error('Error toggling config:', err);
      alert('Failed to update configuration');
    }
  };

  const openEditModal = (config: CopyTradeConfig) => {
    setEditingConfig(config);
    setFormData({
      source_account_id: config.source_account_id,
      destination_account_id: config.destination_account_id,
      multiplier: config.multiplier.toString()
    });
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Copy Trading</h2>
          <p className="text-slate-400 mt-1">
            Automatically copy trades from one account to another
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConfig(null);
            setFormData({
              source_account_id: '',
              destination_account_id: '',
              multiplier: '1.0'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Configuration</span>
        </button>
      </div>

      {/* Active Copy Trade Accounts */}
      {configs.filter((c) => c.enabled).length > 0 && (
        <CopyTradeAccounts refreshKey={refreshKey} />
      )}

      {configs.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h3 className="text-lg font-semibold text-white">
                  No Copy Trade Configurations
                </h3>
                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-600/50 text-slate-400">
                  Inactive
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p>
                  Create a configuration to automatically copy trades from one
                  account to another
                </p>
                <p className="text-slate-500">
                  Set up your first configuration to begin copying trades in
                  real-time with customizable multipliers
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Configuration</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => {
            const sourceAccount = accounts.find(
              (acc) => acc.id === config.source_account_id
            );
            const destAccount = accounts.find(
              (acc) => acc.id === config.destination_account_id
            );

            return (
              <div
                key={config.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 w-full">
                    <div className="flex items-center space-x-3 mb-3">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleEnabled(config)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          config.enabled ? 'bg-green-500' : 'bg-slate-600'
                        }`}
                        title={config.enabled ? 'Pause' : 'Resume'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <h3 className="text-lg font-semibold text-white">
                        {sourceAccount?.name || 'Unknown'} →{' '}
                        {destAccount?.name || 'Unknown'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          config.enabled
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-600/50 text-slate-400'
                        }`}
                      >
                        {config.enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span>
                          <span className="text-slate-500">Multiplier:</span>{' '}
                          <span className="text-white font-medium">
                            {config.multiplier}x
                          </span>
                        </span>
                      </div>

                      {/* Accounts Table - Show for both active and paused configs */}
                      <div className="pt-4 border-t border-slate-700/50 w-full">
                        {configStats[config.id] ? (
                          <div className="overflow-x-auto rounded-lg border border-slate-700/50 w-full">
                            <table className="w-full min-w-full">
                              <thead className="bg-slate-700/50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    Account
                                  </th>
                                  {config.enabled && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                                      Open P&L
                                    </th>
                                  )}
                                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    Total P&L
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50 bg-slate-800/30">
                                {/* Lead Account Row */}
                                <tr className="hover:bg-slate-700/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-white">
                                      {sourceAccount?.name || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      Lead Account
                                    </div>
                                  </td>
                                  {config.enabled && (
                                    <td className="px-6 py-4 text-right">
                                      <span
                                        className={`text-sm font-bold ${
                                          configStats[config.id].sourceStats
                                            .todayPnL.openPnL >= 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }`}
                                      >
                                        {configStats[config.id].sourceStats
                                          .todayPnL.openPnL >= 0
                                          ? '+'
                                          : ''}
                                        {configStats[
                                          config.id
                                        ].sourceStats.todayPnL.openPnL.toFixed(
                                          2
                                        )}{' '}
                                        {sourceAccount?.currency || 'USD'}
                                      </span>
                                    </td>
                                  )}
                                  <td className="px-6 py-4 text-right">
                                    <span
                                      className={`text-sm font-bold ${
                                        configStats[config.id].sourceStats.stats
                                          .totalPnL >= 0
                                          ? 'text-green-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {configStats[config.id].sourceStats.stats
                                        .totalPnL >= 0
                                        ? '+'
                                        : ''}
                                      {configStats[
                                        config.id
                                      ].sourceStats.stats.totalPnL.toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }
                                      )}{' '}
                                      {sourceAccount?.currency || 'USD'}
                                    </span>
                                  </td>
                                </tr>

                                {/* Follower Account Row */}
                                <tr className="hover:bg-slate-700/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-white">
                                      {destAccount?.name || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      Follower Account
                                    </div>
                                  </td>
                                  {config.enabled && (
                                    <td className="px-6 py-4 text-right">
                                      <span
                                        className={`text-sm font-bold ${
                                          configStats[config.id].destStats
                                            .todayPnL.openPnL >= 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }`}
                                      >
                                        {configStats[config.id].destStats
                                          .todayPnL.openPnL >= 0
                                          ? '+'
                                          : ''}
                                        {configStats[
                                          config.id
                                        ].destStats.todayPnL.openPnL.toFixed(
                                          2
                                        )}{' '}
                                        {destAccount?.currency || 'USD'}
                                      </span>
                                    </td>
                                  )}
                                  <td className="px-6 py-4 text-right">
                                    <span
                                      className={`text-sm font-bold ${
                                        configStats[config.id].destStats.stats
                                          .totalPnL >= 0
                                          ? 'text-green-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {configStats[config.id].destStats.stats
                                        .totalPnL >= 0
                                        ? '+'
                                        : ''}
                                      {configStats[
                                        config.id
                                      ].destStats.stats.totalPnL.toLocaleString(
                                        'en-US',
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        }
                                      )}{' '}
                                      {destAccount?.currency || 'USD'}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                            <p className="text-sm text-slate-400">
                              Loading account stats...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(config)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Copy Trade Activity Logs */}
      <CopyTradeLogs />

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editingConfig
                  ? 'Edit Configuration'
                  : 'New Copy Trade Configuration'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingConfig(null);
                  setFormData({
                    source_account_id: '',
                    destination_account_id: '',
                    multiplier: '1.0'
                  });
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Source Account
                </label>
                <select
                  value={formData.source_account_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      source_account_id: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select source account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Trades from this account will be copied
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Destination Account
                </label>
                <select
                  value={formData.destination_account_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      destination_account_id: e.target.value
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select destination account</option>
                  {accounts
                    .filter((acc) => acc.id !== formData.source_account_id)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Trades will be copied to this account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.multiplier}
                  onChange={(e) =>
                    setFormData({ ...formData, multiplier: e.target.value })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1.0"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Scale trades by this factor (e.g., 0.5x = half size, 2x =
                  double size)
                </p>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingConfig(null);
                    setFormData({
                      source_account_id: '',
                      destination_account_id: '',
                      multiplier: '1.0'
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
