'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FireIcon,
  StarIcon
} from '@heroicons/react/24/solid';
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

interface WeeklyTradeData {
  weekStart: string;
  weekEnd: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  weekNumber: number;
}

export default function TradeCalendar({
  accountId,
  month,
  onMonthChange,
  refreshKey = 0
}: TradeCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dailyData, setDailyData] = useState<DailyTradeData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyTradeData[]>([]);
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

        // Also check if we should include yesterday's trades (in case of timezone issues)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        const yesterdayEnd = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate() + 1
        );

        // Fetch trades for the selected month (with some buffer for timezone issues)
        const bufferStart = new Date(startOfMonth);
        bufferStart.setDate(bufferStart.getDate() - 1); // Include day before month start

        const bufferEnd = new Date(endOfMonth);
        bufferEnd.setDate(bufferEnd.getDate() + 1); // Include day after month end

        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .gte('entry_date', bufferStart.toISOString())
          .lte('entry_date', bufferEnd.toISOString())
          .order('entry_date', { ascending: true });

        // If accountId is provided, filter by that account, otherwise get all trades
        console.log('Calendar - Account filtering:', {
          accountId: accountId,
          filteringByAccount: !!accountId
        });

        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: trades, error: tradesError } = await query;

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          setError('Failed to load trade data');
          return;
        }

        // Also fetch all trades to see what's in the database
        const { data: allTrades } = await supabase
          .from('trade_entries' as any)
          .select('*')
          .order('entry_date', { ascending: false })
          .limit(10);

        console.log('Calendar - All recent trades in database:', allTrades);

        console.log('Calendar - Fetched trades:', trades);
        console.log('Calendar - Date range:', {
          startOfMonth: startOfMonth.toISOString(),
          endOfMonth: endOfMonth.toISOString(),
          bufferStart: bufferStart.toISOString(),
          bufferEnd: bufferEnd.toISOString(),
          currentMonth: month.getMonth() + 1,
          currentYear: month.getFullYear(),
          accountId: accountId,
          viewType: accountId ? 'individual' : 'combined'
        });

        // Group trades by date and calculate daily stats
        const dailyMap = new Map<string, DailyTradeData>();

        (trades || []).forEach((trade: any) => {
          // Use local date formatting to avoid timezone issues
          const tradeDateObj = new Date(trade.entry_date);
          const tradeDate =
            tradeDateObj.getFullYear() +
            '-' +
            String(tradeDateObj.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(tradeDateObj.getDate()).padStart(2, '0');

          // Check if trade date is within the current month for display
          const isInCurrentMonth =
            tradeDateObj >= startOfMonth && tradeDateObj <= endOfMonth;

          console.log('Calendar - Processing trade:', {
            id: trade.id,
            symbol: trade.symbol,
            entry_date: trade.entry_date,
            tradeDate: tradeDate,
            pnl_amount: trade.pnl_amount,
            isInCurrentMonth: isInCurrentMonth,
            accountId: accountId,
            viewType: accountId ? 'individual' : 'combined'
          });

          // Only process trades that are in the current month for display
          if (isInCurrentMonth) {
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
          }
        });

        setDailyData(Array.from(dailyMap.values()));

        // Calculate weekly data based on the actual calendar grid
        const weeklyData: WeeklyTradeData[] = [];

        // Calculate how many weeks we need based on the calendar grid
        const totalDays = days.length;
        const numberOfWeeks = Math.ceil(totalDays / 7);

        for (let weekIndex = 0; weekIndex < numberOfWeeks; weekIndex++) {
          const weekStart = weekIndex * 7;
          const weekDays = days.slice(weekStart, weekStart + 7);

          // Only include days from the current month for weekly calculation
          const currentMonthDays = weekDays.filter(
            (day) =>
              day !== null &&
              day.getMonth() === month.getMonth() &&
              day.getFullYear() === month.getFullYear()
          );

          if (currentMonthDays.length > 0) {
            const firstDay = currentMonthDays[0];
            const lastDay = currentMonthDays[currentMonthDays.length - 1];

            if (firstDay && lastDay) {
              const weekData: WeeklyTradeData = {
                weekStart:
                  firstDay.getFullYear() +
                  '-' +
                  String(firstDay.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(firstDay.getDate()).padStart(2, '0'),
                weekEnd:
                  lastDay.getFullYear() +
                  '-' +
                  String(lastDay.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(lastDay.getDate()).padStart(2, '0'),
                trades: 0,
                pnl: 0,
                wins: 0,
                losses: 0,
                weekNumber: weekIndex + 1
              };

              // Aggregate data for this week (only current month days)
              currentMonthDays.forEach((day) => {
                if (day) {
                  const dateStr =
                    day.getFullYear() +
                    '-' +
                    String(day.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(day.getDate()).padStart(2, '0');
                  const dayStats = dailyMap.get(dateStr);
                  if (dayStats) {
                    weekData.trades += dayStats.trades;
                    weekData.pnl += dayStats.pnl;
                    weekData.wins += dayStats.wins;
                    weekData.losses += dayStats.losses;
                  }
                }
              });

              weeklyData.push(weekData);
            }
          } else {
            // Empty week - still add it for proper alignment
            weeklyData.push({
              weekStart: '',
              weekEnd: '',
              trades: 0,
              pnl: 0,
              wins: 0,
              losses: 0,
              weekNumber: weekIndex + 1
            });
          }
        }

        setWeeklyData(weeklyData);
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
    // Use local date formatting to avoid timezone issues
    const dateStr =
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0');
    return dailyData.find((stat) => stat.date === dateStr);
  };

  const getPerformanceColor = (pnl: number) => {
    if (pnl > 0)
      return 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-400/50';
    if (pnl < 0)
      return 'bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-400 border-red-400/50';
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
  const days: (Date | null)[] = [];

  // Add days from previous month
  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(
      new Date(month.getFullYear(), month.getMonth() - 1, daysInPrevMonth - i)
    );
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  // Add days from next month to complete the weeks (only what's needed)
  const totalDaysSoFar = days.length;
  const daysNeededToCompleteWeeks =
    Math.ceil(totalDaysSoFar / 7) * 7 - totalDaysSoFar;
  for (let day = 1; day <= daysNeededToCompleteWeeks; day++) {
    days.push(new Date(month.getFullYear(), month.getMonth() + 1, day));
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
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl p-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header with stunning design */}
      <div className="relative z-10 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <SparklesIcon className="h-2 w-2 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                {monthNames[month.getMonth()]} {month.getFullYear()}
              </h3>
              <p className="text-slate-400 text-sm flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Trading Performance Calendar
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousMonth}
              className="group relative p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <ChevronLeftIcon className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all duration-300"></div>
            </button>
            <button
              onClick={handleNextMonth}
              className="group relative p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="relative z-10 mb-6 p-4 bg-gradient-to-r from-red-900/20 to-pink-900/20 border border-red-500/30 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <SparklesIcon className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-slate-300 font-medium">
              Loading your trading data...
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Analyzing performance metrics
            </p>
          </div>
          <div className="mt-6 w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Calendar Grid with Weekly Performance */}
          <div className="relative z-10">
            {/* Calendar Header with Weekly Column */}
            <div className="grid grid-cols-8 gap-3 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                (day, index) => (
                  <div
                    key={day}
                    className="text-center p-4 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50"
                  >
                    <div className="text-sm font-bold text-slate-300 mb-1">
                      {day}
                    </div>
                    <div className="w-2 h-2 mx-auto bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-60"></div>
                  </div>
                )
              )}
              <div className="text-center p-4 rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                <div className="text-sm font-bold text-slate-300 mb-1">
                  Week
                </div>
                <div className="w-2 h-2 mx-auto bg-gradient-to-r from-emerald-400 to-green-400 rounded-full opacity-60"></div>
              </div>
            </div>

            {/* Calendar Rows with Weekly Performance */}
            <div className="space-y-3">
              {Array.from(
                { length: Math.ceil(days.length / 7) },
                (_, weekIndex) => {
                  const weekStart = weekIndex * 7;
                  const weekDays = days.slice(weekStart, weekStart + 7);
                  const weekData = weeklyData[weekIndex] || null;

                  return (
                    <div key={weekIndex} className="grid grid-cols-8 gap-3">
                      {/* Calendar Days */}
                      {weekDays.map((day, dayIndex) => {
                        if (!day) {
                          return <div key={dayIndex} className="h-24" />;
                        }

                        // Determine if this day belongs to current month, previous month, or next month
                        const isCurrentMonth =
                          day.getMonth() === month.getMonth();
                        const isPreviousMonth =
                          day.getMonth() === month.getMonth() - 1;
                        const isNextMonth =
                          day.getMonth() === month.getMonth() + 1;

                        const dayStats = getStatsForDate(day);
                        const isSelected =
                          selectedDate &&
                          day.toDateString() === selectedDate.toDateString();
                        const isToday =
                          day.toDateString() === new Date().toDateString();
                        const hasTrades = dayStats && dayStats.trades > 0;
                        const isProfit = dayStats && dayStats.pnl > 0;
                        const isLoss = dayStats && dayStats.pnl < 0;

                        return (
                          <button
                            key={dayIndex}
                            onClick={() => setSelectedDate(day)}
                            className={`group relative h-24 p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-center items-center overflow-hidden ${
                              isSelected
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-400 shadow-lg shadow-blue-500/25 scale-105'
                                : !isCurrentMonth
                                  ? 'bg-slate-800/10 border-slate-700/30 hover:bg-slate-700/20 hover:border-slate-600/40 opacity-50'
                                  : hasTrades
                                    ? isProfit
                                      ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-400/50 hover:from-emerald-500/30 hover:to-green-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20'
                                      : 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-400/50 hover:from-red-500/30 hover:to-pink-500/30 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20'
                                    : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/40 hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-500/10'
                            } ${isToday ? 'ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20' : ''}`}
                          >
                            {/* Animated background gradient */}
                            <div
                              className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-blue-400/20 to-purple-500/20 opacity-100'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            ></div>

                            {/* Day number */}
                            <div
                              className={`relative z-10 text-sm font-bold mb-1 transition-colors ${
                                isSelected
                                  ? 'text-white'
                                  : !isCurrentMonth
                                    ? 'text-slate-500'
                                    : isToday
                                      ? 'text-cyan-300'
                                      : hasTrades
                                        ? isProfit
                                          ? 'text-emerald-300'
                                          : 'text-red-300'
                                        : 'text-slate-300'
                              }`}
                            >
                              {day.getDate()}
                            </div>

                            {/* Trade indicators - only show for current month */}
                            {isCurrentMonth && hasTrades && (
                              <div className="relative z-10 flex items-center space-x-1 mb-1">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isProfit ? 'bg-emerald-400' : 'bg-red-400'
                                  } animate-pulse`}
                                ></div>
                                <span
                                  className={`text-xs font-semibold ${
                                    isSelected
                                      ? 'text-white/80'
                                      : isProfit
                                        ? 'text-emerald-300'
                                        : 'text-red-300'
                                  }`}
                                >
                                  {dayStats.trades}
                                </span>
                              </div>
                            )}

                            {/* P&L display - only show for current month */}
                            {isCurrentMonth &&
                              dayStats &&
                              dayStats.pnl !== 0 && (
                                <div
                                  className={`relative z-10 text-xs font-bold transition-all duration-300 ${
                                    isSelected
                                      ? 'text-white/90'
                                      : isProfit
                                        ? 'text-emerald-300'
                                        : 'text-red-300'
                                  }`}
                                >
                                  {formatPnl(dayStats.pnl)}
                                </div>
                              )}

                            {/* Performance icons - only show for current month */}
                            {isCurrentMonth && hasTrades && (
                              <div className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                {isProfit ? (
                                  <ArrowTrendingUpIcon className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <ArrowTrendingDownIcon className="h-3 w-3 text-red-400" />
                                )}
                              </div>
                            )}

                            {/* Special effects for today */}
                            {isToday && (
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 animate-pulse"></div>
                            )}

                            {/* Hover glow effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
                          </button>
                        );
                      })}

                      {/* Weekly Performance Column */}
                      <div className="h-24 p-3 rounded-2xl border border-slate-700/50 bg-slate-800/30 flex flex-col justify-center items-center">
                        {weekData && weekData.trades > 0 ? (
                          <>
                            <div className="text-xs font-bold text-slate-300 mb-1">
                              Week {weekData.weekNumber}
                            </div>
                            <div
                              className={`text-lg font-bold mb-1 ${
                                weekData.pnl > 0
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {formatPnl(weekData.pnl)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {weekData.trades} trades
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Week {weekIndex + 1}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Beautiful selected date details panel */}
          {selectedDate && (
            <div className="relative z-10 mt-8 p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl">
              {/* Animated background */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <CalendarDaysIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                      {selectedDate!.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Trading Performance Details
                    </p>
                  </div>
                </div>

                {selectedDate && getStatsForDate(selectedDate!) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Trades Card */}
                    <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                          <ChartBarIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-slate-400 font-medium">
                          Total Trades
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">
                        {getStatsForDate(selectedDate!)?.trades || 0}
                      </div>
                      <div className="text-sm text-slate-500">
                        Trades executed
                      </div>
                    </div>

                    {/* P&L Card */}
                    <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                          <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 font-medium">
                          Net P&L
                        </span>
                      </div>
                      <div
                        className={`text-3xl font-bold mb-1 ${
                          (getStatsForDate(selectedDate!)?.pnl || 0) >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatPnl(getStatsForDate(selectedDate!)?.pnl || 0)}
                      </div>
                      <div className="text-sm text-slate-500">
                        Profit & Loss
                      </div>
                    </div>

                    {/* Wins Card */}
                    <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                          <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 font-medium">
                          Winning Trades
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-emerald-400 mb-1">
                        {getStatsForDate(selectedDate!)?.wins || 0}
                      </div>
                      <div className="text-sm text-slate-500">
                        Profitable trades
                      </div>
                    </div>

                    {/* Losses Card */}
                    <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <span className="text-slate-400 font-medium">
                          Losing Trades
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-red-400 mb-1">
                        {getStatsForDate(selectedDate!)?.losses || 0}
                      </div>
                      <div className="text-sm text-slate-500">
                        Unprofitable trades
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <CalendarDaysIcon className="h-10 w-10 text-slate-500" />
                    </div>
                    <h5 className="text-xl font-semibold text-slate-300 mb-2">
                      No Trading Activity
                    </h5>
                    <p className="text-slate-500">
                      No trades were executed on this date
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
