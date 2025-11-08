'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  ChartBarIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface PerformanceAnalysisProps {
  accountId: string | null;
  className?: string;
  refreshKey?: number;
}

interface TimeOfDayStats {
  hour: number;
  trades: number;
  totalRR: number;
  averageRR: number;
  winRate: number;
  wins: number;
  losses: number;
}

interface DayOfWeekStats {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  trades: number;
  totalRR: number;
  averageRR: number;
  winRate: number;
  wins: number;
  losses: number;
}

export default function PerformanceAnalysis({
  accountId,
  className = '',
  refreshKey = 0
}: PerformanceAnalysisProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'time' | 'day'>('time');

  const supabase = createClient();

  useEffect(() => {
    fetchTrades();
  }, [accountId, refreshKey]);

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('trade_entries' as any)
        .select('*')
        .eq('status', 'closed')
        .not('rr', 'is', null)
        .order('entry_date', { ascending: true });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching trades:', fetchError);
        setError('Failed to load trades');
        return;
      }

      setTrades((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time of day statistics
  const timeOfDayStats = useMemo(() => {
    const stats: TimeOfDayStats[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      trades: 0,
      totalRR: 0,
      averageRR: 0,
      winRate: 0,
      wins: 0,
      losses: 0
    }));

    trades.forEach((trade) => {
      const entryDate = new Date(trade.entry_date);
      const hour = entryDate.getUTCHours();
      const rr = trade.rr || 0;

      stats[hour].trades++;
      stats[hour].totalRR += rr;
      if (rr > 0) stats[hour].wins++;
      if (rr < 0) stats[hour].losses++;
    });

    return stats.map((stat) => ({
      ...stat,
      averageRR: stat.trades > 0 ? stat.totalRR / stat.trades : 0,
      winRate: stat.trades > 0 ? (stat.wins / stat.trades) * 100 : 0
    }));
  }, [trades]);

  // Calculate day of week statistics
  const dayOfWeekStats = useMemo(() => {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const stats: DayOfWeekStats[] = Array.from({ length: 7 }, (_, day) => ({
      day,
      dayName: dayNames[day],
      trades: 0,
      totalRR: 0,
      averageRR: 0,
      winRate: 0,
      wins: 0,
      losses: 0
    }));

    trades.forEach((trade) => {
      const entryDate = new Date(trade.entry_date);
      const day = entryDate.getUTCDay();
      const rr = trade.rr || 0;

      stats[day].trades++;
      stats[day].totalRR += rr;
      if (rr > 0) stats[day].wins++;
      if (rr < 0) stats[day].losses++;
    });

    return stats.map((stat) => ({
      ...stat,
      averageRR: stat.trades > 0 ? stat.totalRR / stat.trades : 0,
      winRate: stat.trades > 0 ? (stat.wins / stat.trades) * 100 : 0
    }));
  }, [trades]);

  const formatRR = (rr: number) => {
    return `${rr >= 0 ? '+' : ''}${rr.toFixed(2)}R`;
  };

  const getMaxValue = (
    stats: TimeOfDayStats[] | DayOfWeekStats[],
    field: 'totalRR' | 'trades'
  ) => {
    return Math.max(...stats.map((s) => Math.abs(s[field] as number)), 0);
  };

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-400">
            Loading performance analysis...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTrades}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
      >
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No trades available for analysis</p>
        </div>
      </div>
    );
  }

  const maxRR = getMaxValue(timeOfDayStats, 'totalRR');
  const maxTrades = getMaxValue(timeOfDayStats, 'trades');

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          Performance Analysis
        </h3>
        <p className="text-sm text-slate-400">
          Analyze your trading performance by time patterns
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('time')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'time'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4" />
            <span>Time of Day</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('day')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'day'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Day of Week</span>
          </div>
        </button>
      </div>

      {/* Time of Day Analysis */}
      {activeTab === 'time' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total RR by Hour */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">
                Total RR by Hour
              </h4>
              <div className="space-y-2">
                {timeOfDayStats.map((stat) => {
                  const barWidth =
                    maxRR > 0 ? (Math.abs(stat.totalRR) / maxRR) * 100 : 0;
                  return (
                    <div
                      key={stat.hour}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-12 text-xs text-slate-400 text-right">
                        {stat.hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className={`h-full transition-all ${
                            stat.totalRR >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {stat.trades > 0 && formatRR(stat.totalRR)}
                        </div>
                      </div>
                      <div className="w-16 text-xs text-slate-400 text-right">
                        {stat.trades} trades
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Win Rate by Hour */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">
                Win Rate by Hour
              </h4>
              <div className="space-y-2">
                {timeOfDayStats.map((stat) => {
                  if (stat.trades === 0) return null;
                  return (
                    <div
                      key={stat.hour}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-12 text-xs text-slate-400 text-right">
                        {stat.hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${stat.winRate}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {stat.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="w-16 text-xs text-slate-400 text-right">
                        {stat.wins}W / {stat.losses}L
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {(() => {
              const bestHour = [...timeOfDayStats].sort(
                (a, b) => b.totalRR - a.totalRR
              )[0];
              const worstHour = [...timeOfDayStats].sort(
                (a, b) => a.totalRR - b.totalRR
              )[0];
              const mostTradesHour = [...timeOfDayStats].sort(
                (a, b) => b.trades - a.trades
              )[0];
              const bestWinRateHour = [...timeOfDayStats]
                .filter((s) => s.trades >= 5)
                .sort((a, b) => b.winRate - a.winRate)[0];

              return (
                <>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">Best Hour</div>
                    <div className="text-lg font-bold text-green-400">
                      {bestHour.hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatRR(bestHour.totalRR)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">
                      Worst Hour
                    </div>
                    <div className="text-lg font-bold text-red-400">
                      {worstHour.hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatRR(worstHour.totalRR)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">
                      Most Active
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                      {mostTradesHour.hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="text-xs text-slate-400">
                      {mostTradesHour.trades} trades
                    </div>
                  </div>
                  {bestWinRateHour && (
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="text-xs text-slate-400 mb-1">
                        Best Win Rate
                      </div>
                      <div className="text-lg font-bold text-purple-400">
                        {bestWinRateHour.hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="text-xs text-slate-400">
                        {bestWinRateHour.winRate.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Day of Week Analysis */}
      {activeTab === 'day' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total RR by Day */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">
                Total RR by Day
              </h4>
              <div className="space-y-2">
                {dayOfWeekStats.map((stat) => {
                  const maxDayRR = Math.max(
                    ...dayOfWeekStats.map((s) => Math.abs(s.totalRR)),
                    0
                  );
                  const barWidth =
                    maxDayRR > 0
                      ? (Math.abs(stat.totalRR) / maxDayRR) * 100
                      : 0;
                  return (
                    <div key={stat.day} className="flex items-center space-x-3">
                      <div className="w-20 text-xs text-slate-400 text-right">
                        {stat.dayName.slice(0, 3)}
                      </div>
                      <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className={`h-full transition-all ${
                            stat.totalRR >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {stat.trades > 0 && formatRR(stat.totalRR)}
                        </div>
                      </div>
                      <div className="w-16 text-xs text-slate-400 text-right">
                        {stat.trades} trades
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Win Rate by Day */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">
                Win Rate by Day
              </h4>
              <div className="space-y-2">
                {dayOfWeekStats.map((stat) => {
                  if (stat.trades === 0) return null;
                  return (
                    <div key={stat.day} className="flex items-center space-x-3">
                      <div className="w-20 text-xs text-slate-400 text-right">
                        {stat.dayName.slice(0, 3)}
                      </div>
                      <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden relative">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${stat.winRate}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {stat.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="w-16 text-xs text-slate-400 text-right">
                        {stat.wins}W / {stat.losses}L
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {(() => {
              const bestDay = [...dayOfWeekStats].sort(
                (a, b) => b.totalRR - a.totalRR
              )[0];
              const worstDay = [...dayOfWeekStats].sort(
                (a, b) => a.totalRR - b.totalRR
              )[0];
              const mostTradesDay = [...dayOfWeekStats].sort(
                (a, b) => b.trades - a.trades
              )[0];
              const bestWinRateDay = [...dayOfWeekStats]
                .filter((s) => s.trades >= 5)
                .sort((a, b) => b.winRate - a.winRate)[0];

              return (
                <>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">Best Day</div>
                    <div className="text-lg font-bold text-green-400">
                      {bestDay.dayName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatRR(bestDay.totalRR)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">Worst Day</div>
                    <div className="text-lg font-bold text-red-400">
                      {worstDay.dayName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatRR(worstDay.totalRR)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-1">
                      Most Active
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                      {mostTradesDay.dayName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {mostTradesDay.trades} trades
                    </div>
                  </div>
                  {bestWinRateDay && (
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <div className="text-xs text-slate-400 mb-1">
                        Best Win Rate
                      </div>
                      <div className="text-lg font-bold text-purple-400">
                        {bestWinRateDay.dayName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {bestWinRateDay.winRate.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
