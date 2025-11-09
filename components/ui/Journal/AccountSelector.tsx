'use client';

import { useState } from 'react';
import {
  ViewColumnsIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Plus } from '@phosphor-icons/react';
import type { TradingAccount } from '@/types/journal';
import CreateAccountModal from './CreateAccountModal';
import ShareButton from './ShareButton';

interface AccountSelectorProps {
  accounts: (TradingAccount & { stats: any })[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string | null) => void;
  onAccountCreated: (account: TradingAccount) => void;
  view: 'individual' | 'combined';
  onViewChange: (view: 'individual' | 'combined') => void;
}

export default function AccountSelector({
  accounts,
  selectedAccount,
  onAccountChange,
  onAccountCreated,
  view,
  onViewChange
}: AccountSelectorProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Combined View Button */}
        <button
          onClick={() => onViewChange('combined')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            view === 'combined'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
          }`}
        >
          <ViewColumnsIcon className="h-4 w-4" />
          <span>All Accounts</span>
        </button>

        {/* Individual Account Buttons */}
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              onViewChange('individual');
              onAccountChange(account.id);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              view === 'individual' && selectedAccount === account.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>{account.name}</span>
            {account.stats && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  account.stats.totalRR >= 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {account.stats.totalRR >= 0 ? '+' : ''}
                {account.stats.totalRR?.toFixed(1) || '0.0'}R
              </span>
            )}
          </button>
        ))}

        {/* Share Button for selected account */}
        {view === 'individual' && selectedAccount && (
          <ShareButton
            accountId={selectedAccount}
            accountName={
              accounts.find((acc) => acc.id === selectedAccount)?.name || ''
            }
            isPublic={true}
          />
        )}

        {/* Create Account Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
          title="Create New Account"
        >
          <Plus size={18} weight="bold" />
        </button>
      </div>

      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAccountCreated={onAccountCreated}
      />
    </>
  );
}
