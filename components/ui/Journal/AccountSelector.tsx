'use client';

import { useState } from 'react';
import { ViewColumnsIcon, UserIcon } from '@heroicons/react/24/outline';
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
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'combined'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
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
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'individual' && selectedAccount === account.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>{account.name}</span>
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
          className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
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
