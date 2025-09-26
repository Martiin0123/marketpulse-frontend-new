'use client';

import { useState } from 'react';
import {
  PlusIcon,
  ViewColumnsIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import type { TradingAccount } from '@/types/journal';
import CreateAccountModal from './CreateAccountModal';

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
      <div className="flex items-center space-x-2 flex-wrap">
        {/* Combined View Button */}
        <button
          onClick={() => onViewChange('combined')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'combined'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <ViewColumnsIcon className="h-4 w-4" />
          <span>Combined</span>
        </button>

        {/* Individual Account Buttons */}
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              onViewChange('individual');
              onAccountChange(account.id);
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'individual' && selectedAccount === account.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>{account.name}</span>
          </button>
        ))}

        {/* Create Account Button - Just Plus Icon */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Create New Account"
        >
          <PlusIcon className="h-5 w-5" />
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
