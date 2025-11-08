'use client';

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

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSelectAccount(account.id)}
            className="group relative bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700/70 hover:to-slate-800/70 rounded-lg p-4 border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 text-left"
          >
            {/* Account Name */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                {account.name}
              </h4>
              <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-1 rounded">
                {account.currency}
              </span>
            </div>

            {/* Total RR - Main Metric */}
            <div className="mb-2">
              <div className="text-xs text-slate-400 mb-1">Total RR</div>
              <div
                className={`text-2xl font-bold ${getPerformanceColor(account.stats.totalRR)}`}
              >
                {account.stats.totalRR >= 0 ? '+' : ''}
                {account.stats.totalRR.toFixed(2)}R
              </div>
            </div>

            {/* Win Rate - Secondary Metric */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Win Rate</span>
              <span className="text-white font-medium">
                {account.stats.winRate.toFixed(0)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
