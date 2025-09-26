'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import type { DailyStats, TradeEntry } from '@/types/journal';

interface TradeCalendarProps {
  accountId?: string | null;
  month: Date;
  onMonthChange: (month: Date) => void;
  refreshKey?: number;
}

interface DailyTradeData {
  date: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
}

export default function TradeCalendar({
  accountId,
  month,
  onMonthChange,
  refreshKey = 0
}: TradeCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyData, setDailyData] = useState<DailyTradeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchTradesForMonth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the start and end of the month
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(
          month.getFullYear(),
          month.getMonth() + 1,
          0
        );

        // Fetch trades for the selected month
        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .gte('entry_date', startOfMonth.toISOString())
          .lte('entry_date', endOfMonth.toISOString())
          .order('entry_date', { ascending: true });

        // If accountId is provided, filter by that account, otherwise get all trades
        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: trades, error: tradesError } = await query;

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          setError('Failed to load trade data');
          return;
        }

        // Group trades by date and calculate daily stats
        const dailyMap = new Map<string, DailyTradeData>();

        (trades || []).forEach((trade: any) => {
          const tradeDate = new Date(trade.entry_date)
            .toISOString()
            .split('T')[0];

          if (!dailyMap.has(tradeDate)) {
            dailyMap.set(tradeDate, {
              date: tradeDate,
              trades: 0,
              pnl: 0,
              wins: 0,
              losses: 0
            });
          }

          const dayData = dailyMap.get(tradeDate)!;
          dayData.trades += 1;

          if (
            trade.pnl_amount !== null &&
            trade.pnl_amount !== undefined &&
            !isNaN(trade.pnl_amount)
          ) {
            dayData.pnl += trade.pnl_amount;
            if (trade.pnl_amount > 0) {
              dayData.wins += 1;
            } else if (trade.pnl_amount < 0) {
              dayData.losses += 1;
            }
          }
        });

        setDailyData(Array.from(dailyMap.values()));
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError('Failed to load trade data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradesForMonth();
  }, [accountId, month, supabase, refreshKey]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getStatsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dailyData.find((stat) => stat.date === dateStr);
  };

  const getPerformanceColor = (pnl: number) => {
    if (pnl > 0) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (pnl < 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const formatPnl = (pnl: number) => {
    if (isNaN(pnl) || pnl === null || pnl === undefined) {
      return '$0';
    }
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${Math.abs(pnl).toLocaleString()}`;
  };

  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfMonth(month);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  const handlePreviousMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(month.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(month);
    newMonth.setMonth(month.getMonth() + 1);
    onMonthChange(newMonth);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          {monthNames[month.getMonth()]} {month.getFullYear()}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-400" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-400">Loading trades...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-slate-400 p-3"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={index} className="h-20" />;
              }

              const dayStats = getStatsForDate(day);
              const isSelected =
                selectedDate &&
                day.toDateString() === selectedDate.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`h-20 p-2 rounded-lg border transition-colors flex flex-col justify-center items-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500'
                      : dayStats
                        ? getPerformanceColor(dayStats.pnl)
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                  } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="text-sm font-semibold mb-1 flex items-center justify-center">
                    {day.getDate()}
                    {dayStats && dayStats.trades > 0 && (
                      <span className="ml-1 text-xs opacity-60">
                        ({dayStats.trades})
                      </span>
                    )}
                  </div>
                  {dayStats && dayStats.pnl !== 0 && (
                    <div className="text-xs font-bold">
                      {formatPnl(dayStats.pnl)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-6 p-6 bg-slate-700/50 rounded-lg border border-slate-600">
              <h4 className="text-lg font-semibold text-white mb-4">
                {selectedDate.toLocaleDateString()}
              </h4>
              {getStatsForDate(selectedDate) ? (
                <div className="grid grid-cols-2 gap-6 text-base">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Trades:</span>
                    <span className="text-white font-semibold">
                      {getStatsForDate(selectedDate)?.trades || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">P&L:</span>
                    <span
                      className={`font-bold text-lg ${
                        (getStatsForDate(selectedDate)?.pnl || 0) >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {formatPnl(getStatsForDate(selectedDate)?.pnl || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Wins:</span>
                    <span className="text-green-400 font-semibold">
                      {getStatsForDate(selectedDate)?.wins || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Losses:</span>
                    <span className="text-red-400 font-semibold">
                      {getStatsForDate(selectedDate)?.losses || 0}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-base">
                  No trades on this date
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
