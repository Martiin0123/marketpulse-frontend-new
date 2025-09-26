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
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Accounts Overview</h3>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-slate-400 mb-2 font-medium">
            No trading accounts found
          </p>
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
              className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 hover:from-slate-700/70 hover:to-slate-800/70 rounded-xl p-5 cursor-pointer transition-all duration-300 border border-slate-600/30 hover:border-slate-500/50 hover:shadow-lg group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {account.name}
                  </h4>
                </div>
                <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-1 rounded-full">
                  {account.currency}
                </span>
              </div>

              {/* Main Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total P&L</span>
                  <div className="flex items-center space-x-1">
                    {getPerformanceIcon(account.stats.totalPnL)}
                    <span
                      className={`text-sm font-bold ${getPerformanceColor(account.stats.totalPnL)}`}
                    >
                      {account.currency}{' '}
                      {account.stats.totalPnL.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Win Rate</span>
                  <span className="text-sm font-semibold text-white">
                    {account.stats.winRate.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Trades</span>
                  <span className="text-sm font-semibold text-white">
                    {account.stats.totalTrades}
                  </span>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Performance</span>
                  <span>{account.stats.winRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-600/50 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(account.stats.winRate, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="pt-3 border-t border-slate-600/50">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Best Trade</span>
                    <span className="text-green-400 font-medium">
                      {account.currency} {account.stats.bestTrade.toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Worst Trade</span>
                    <span className="text-red-400 font-medium">
                      {account.currency} {account.stats.worstTrade.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
