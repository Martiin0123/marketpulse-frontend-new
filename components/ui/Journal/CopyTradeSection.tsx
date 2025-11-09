'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Plus,
  TrashIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import type { TradingAccount } from '@/types/journal';

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

  const supabase = createClient();

  useEffect(() => {
    loadConfigs();
  }, [refreshKey]);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      // For now, we'll use a simple approach - store configs in a table
      // In the future, we can create a proper copy_trade_configs table
      const { data, error: fetchError } = await supabase
        .from('copy_trade_configs' as any)
        .select(
          '*, source_account:trading_accounts!source_account_id(*), destination_account:trading_accounts!destination_account_id(*)'
        )
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
        setConfigs(data as CopyTradeConfig[]);
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

      {configs.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400 mb-4">
            No copy trade configurations yet
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Create a configuration to automatically copy trades from one account
            to another
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create First Configuration
          </button>
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
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
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
                    <div className="space-y-2 text-sm text-slate-400">
                      <div className="flex items-center space-x-4">
                        <span>
                          <span className="text-slate-500">Source:</span>{' '}
                          {sourceAccount?.name || 'Unknown Account'}
                        </span>
                        <span>
                          <span className="text-slate-500">Destination:</span>{' '}
                          {destAccount?.name || 'Unknown Account'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Multiplier:</span>{' '}
                        <span className="text-white font-medium">
                          {config.multiplier}x
                        </span>
                        <span className="text-slate-500 ml-4">
                          (Trades will be scaled by this factor)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleEnabled(config)}
                      className={`p-2 rounded-lg transition-colors ${
                        config.enabled
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                      title={config.enabled ? 'Pause' : 'Resume'}
                    >
                      {config.enabled ? (
                        <PauseIcon className="h-5 w-5" />
                      ) : (
                        <PlayIcon className="h-5 w-5" />
                      )}
                    </button>
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
