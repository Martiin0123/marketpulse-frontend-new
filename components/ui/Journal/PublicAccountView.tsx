'use client';

import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ShareIcon,
  EyeIcon,
  FireIcon,
  StarIcon
} from '@heroicons/react/24/solid';
import {
  ShareIcon as ShareIconOutline,
  EyeIcon as EyeIconOutline
} from '@heroicons/react/24/outline';
import { useState, useMemo } from 'react';
import BalanceCurveChart from './BalanceCurveChart';
import TradeCalendar from './TradeCalendar';

interface PublicAccountViewProps {
  account: any;
  trades: any[];
  stats: any;
  shareId: string;
}

export default function PublicAccountView({
  account,
  trades,
  stats,
  shareId
}: PublicAccountViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate balance curve data
  const balanceCurve = useMemo(() => {
    if (!trades || trades.length === 0) {
      return [{ date: new Date(), balance: account.initial_balance }];
    }

    // Sort trades by date
    const sortedTrades = [...trades].sort(
      (a, b) =>
        new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    let runningBalance = account.initial_balance;
    const curveData = [
      {
        date: new Date(account.created_at),
        balance: runningBalance,
        pnl: 0
      }
    ];

    sortedTrades.forEach((trade) => {
      runningBalance += trade.pnl_amount || 0;
      curveData.push({
        date: new Date(trade.entry_date),
        balance: runningBalance,
        pnl: trade.pnl_amount || 0
      });
    });

    return curveData;
  }, [trades, account.initial_balance, account.created_at]);

  // Calculate daily stats for the calendar
  const dailyStats = useMemo(() => {
    const statsMap = new Map();

    trades.forEach((trade) => {
      const date = new Date(trade.entry_date).toISOString().split('T')[0];
      if (!statsMap.has(date)) {
        statsMap.set(date, {
          date,
          trades: 0,
          pnl: 0,
          wins: 0,
          losses: 0
        });
      }

      const dayStats = statsMap.get(date);
      dayStats.trades += 1;
      dayStats.pnl += trade.pnl_amount || 0;
      if (trade.pnl_amount > 0) dayStats.wins += 1;
      if (trade.pnl_amount < 0) dayStats.losses += 1;
    });

    return Array.from(statsMap.values());
  }, [trades]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl border-b border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <ShareIcon className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  {account.name}
                </h1>
                <p className="text-slate-400 text-lg mt-2 flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2" />
                  Public Trading Performance
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="text-slate-500 text-sm">
                    {account.currency} • Started{' '}
                    {new Date(account.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(account.initial_balance)}
              </div>
              <div className="text-slate-400 text-sm">Initial Balance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Performance Overview */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Performance</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total P&L</span>
                  <span
                    className={`text-2xl font-bold ${
                      stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(stats.totalPnL)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Trades</span>
                  <span className="text-xl font-semibold text-white">
                    {stats.totalTrades}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="text-xl font-semibold text-emerald-400">
                    {formatPercentage(stats.winRate)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Best Trade</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(stats.bestTrade)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Worst Trade</span>
                  <span className="text-lg font-semibold text-red-400">
                    {formatCurrency(stats.worstTrade)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Risk Management
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fixed Risk</span>
                  <span className="text-xl font-semibold text-white">
                    {formatCurrency(account.fixed_risk)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average Win</span>
                  <span className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(stats.averageWin)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average Loss</span>
                  <span className="text-lg font-semibold text-red-400">
                    {formatCurrency(stats.averageLoss)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Curve, Calendar and Performance */}
          <div className="lg:col-span-2 space-y-8">
            {/* Balance Curve Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Balance Curve</h3>
              </div>

              <div className="h-80 relative">
                <BalanceCurveChart data={balanceCurve} />
              </div>
            </div>

            {/* Trading Calendar */}
            <TradeCalendar
              accountId={account.id}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
            />

            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Win/Loss Distribution */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    Win/Loss Ratio
                  </h4>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Winning Trades</span>
                    <span className="text-emerald-400 font-semibold">
                      {stats.totalTrades > 0
                        ? Math.round((stats.winRate / 100) * stats.totalTrades)
                        : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Losing Trades</span>
                    <span className="text-red-400 font-semibold">
                      {stats.totalTrades > 0
                        ? Math.round(
                            ((100 - stats.winRate) / 100) * stats.totalTrades
                          )
                        : 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2 mt-4">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${stats.winRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-6 shadow-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-4 w-4 text-orange-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Risk Metrics</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Risk per Trade</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(account.fixed_risk)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Max Drawdown</span>
                    <span className="text-red-400 font-semibold">
                      {formatCurrency(stats.maxDrawdown)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Win Streak</span>
                    <span className="text-emerald-400 font-semibold">
                      {stats.winStreak}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900/50 border-t border-slate-700/50 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm">
            This is a public view of trading performance. Data is read-only.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Shared via MarketPulse • {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
