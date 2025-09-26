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
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewChange('combined')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'combined'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <ViewColumnsIcon className="h-4 w-4" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => onViewChange('individual')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Individual</span>
          </button>
        </div>

        {view === 'individual' && (
          <select
            value={selectedAccount || ''}
            onChange={(e) => onAccountChange(e.target.value || null)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Account</span>
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
