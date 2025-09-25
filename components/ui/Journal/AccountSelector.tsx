'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { TradingAccount } from '@/types/journal';
import CreateAccountModal from './CreateAccountModal';

interface AccountSelectorProps {
  accounts: TradingAccount[];
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateAccount = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center">
        <div className="flex rounded-lg bg-slate-800 p-0.5 overflow-x-auto">
          <button
            onClick={() => {
              onViewChange('combined');
              onAccountChange(null);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'combined'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All Accounts
          </button>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onViewChange('individual');
                onAccountChange(account.id);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                view === 'individual' && selectedAccount === account.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{account.name}</span>
                <span className="text-xs opacity-60">
                  {account.currency} {account.initial_balance.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleCreateAccount}
          className="ml-2 p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 text-green-400"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <CreateAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccountCreated={onAccountCreated}
      />
    </>
  );
}
