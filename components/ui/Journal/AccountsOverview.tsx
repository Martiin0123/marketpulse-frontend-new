'use client';

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import type { TradingAccount, AccountStats } from '@/types/journal';

interface AccountsOverviewProps {
  accounts: (TradingAccount & { stats: AccountStats })[];
  onSelectAccount: (accountId: string) => void;
}

export default function AccountsOverview({
  accounts,
  onSelectAccount
}: AccountsOverviewProps) {
  const getPerformanceColor = (rr: number) => {
    if (rr > 0) return 'text-green-400';
    if (rr < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getPerformanceIcon = (rr: number) => {
    if (rr > 0) return <ArrowUpIcon className="h-4 w-4 text-green-400" />;
    if (rr < 0) return <ArrowDownIcon className="h-4 w-4 text-red-400" />;
    return null;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Accounts Overview
      </h3>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">No trading accounts found</p>
          <p className="text-sm text-slate-500">
            Create your first account to start tracking your trades
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => onSelectAccount(account.id)}
              className="bg-slate-700/50 hover:bg-slate-700 rounded-lg p-4 cursor-pointer transition-colors border border-slate-600 hover:border-slate-500"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{account.name}</h4>
                <span className="text-sm text-slate-400">
                  {account.currency}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total R</span>
                  <div className="flex items-center space-x-1">
                    {getPerformanceIcon(account.stats.totalRR)}
                    <span
                      className={`text-sm font-medium ${getPerformanceColor(account.stats.totalRR)}`}
                    >
                      {account.stats.totalRR.toFixed(1)}R
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Win Rate</span>
                  <span className="text-sm text-white">
                    {account.stats.winRate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Trades</span>
                  <span className="text-sm text-white">
                    {account.stats.totalTrades}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Avg R:R</span>
                  <span className="text-sm text-white">
                    {account.stats.averageRR.toFixed(1)}R
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Balance</span>
                  <span className="text-xs text-slate-400">
                    {account.currency}{' '}
                    {account.initial_balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Risk</span>
                  <span className="text-xs text-slate-400">
                    {account.risk_per_trade}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
