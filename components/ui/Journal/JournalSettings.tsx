'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Plus } from '@phosphor-icons/react';
import SettingsModal from './SettingsModal';
import CreateAccountModal from './CreateAccountModal';
import EditAccountModal from './EditAccountModal';
import ConnectBrokerModal from './ConnectBrokerModal';
import BrokerConnection from './BrokerConnection';
import type { TradingAccount } from '@/types/journal';

interface JournalSettingsProps {
  accounts: (TradingAccount & { stats: any })[];
  onAccountDeleted: (accountId: string) => void;
  onAccountCreated: (account: TradingAccount) => Promise<void>;
  onAccountUpdated?: (account: TradingAccount) => Promise<void>;
  className?: string;
}

export default function JournalSettings({
  accounts,
  onAccountDeleted,
  onAccountCreated,
  onAccountUpdated,
  className = ''
}: JournalSettingsProps) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isConnectBrokerModalOpen, setIsConnectBrokerModalOpen] =
    useState(false);
  const [selectedBrokerType, setSelectedBrokerType] = useState<
    'projectx' | null
  >(null);

  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    if (
      !confirm(
        `Are you sure you want to delete "${account.name}"? This will also delete all trades associated with this account. This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(accountId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('trading_accounts' as any)
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
        return;
      }

      onAccountDeleted(accountId);
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-slate-400">Manage your accounts and preferences</p>
      </div>

      {/* Tag Settings */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Tag Management</h3>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Manage Tags
          </button>
        </div>
        <p className="text-sm text-slate-400">
          Create and manage tags to organize your trades. Tags help you filter
          and analyze your trading performance.
        </p>
      </div>

      {/* Account Management */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Account Management
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedBrokerType('projectx');
                setIsConnectBrokerModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={18} weight="bold" />
              <span>Connect Project X</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={18} weight="bold" />
              <span>Create Manual Account</span>
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No accounts found</p>
              <p className="text-sm text-slate-500">
                Create your first account to start tracking trades
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 hover:border-slate-500 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-white font-medium">
                        {account.name}
                      </h4>
                      <span className="text-xs text-slate-400 bg-slate-600 px-2 py-0.5 rounded">
                        {account.currency}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-400 mb-3">
                      <span>
                        Initial: {account.initial_balance.toLocaleString()}{' '}
                        {account.currency}
                      </span>
                      <span>•</span>
                      <span>{account.stats?.totalTrades || 0} trades</span>
                      <span>•</span>
                      <span
                        className={
                          account.stats?.totalRR >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {account.stats?.totalRR >= 0 ? '+' : ''}
                        {account.stats?.totalRR?.toFixed(2) || '0.00'}R
                      </span>
                    </div>
                    {/* Broker Connection integrated into same box */}
                    <div className="mt-3 pt-3 border-t border-slate-600/50">
                      <BrokerConnection
                        tradingAccountId={account.id}
                        accountName={account.name}
                        brokerType="projectx"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingAccount(account);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit account"
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
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={isDeleting === account.id}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete account"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAccountCreated={async (account) => {
          await onAccountCreated(account);
          setIsCreateModalOpen(false);
        }}
      />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onAccountUpdated={async (updatedAccount) => {
          if (onAccountUpdated) {
            await onAccountUpdated(updatedAccount);
          } else {
            // Fallback: reload if no callback provided
            window.location.reload();
          }
        }}
      />

    </div>
  );
}
