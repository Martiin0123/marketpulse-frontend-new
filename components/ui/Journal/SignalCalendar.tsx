'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
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

interface SignalCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  refreshKey?: number;
}

interface DailySignalData {
  date: string;
  signals: number;
  totalGain: number;
  averageGain: number;
  wins: number;
  losses: number;
}

interface WeeklySignalData {
  weekStart: string;
  weekEnd: string;
  signals: number;
  totalGain: number;
  averageGain: number;
  wins: number;
  losses: number;
  weekNumber: number;
}

export default function SignalCalendar({
  month,
  onMonthChange,
  refreshKey
}: SignalCalendarProps) {
  const [dailyData, setDailyData] = useState<DailySignalData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklySignalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchSignalsForMonth = async () => {
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

        // Fetch signals for the selected month (with some buffer for timezone issues)
        const bufferStart = new Date(startOfMonth);
        bufferStart.setDate(bufferStart.getDate() - 1); // Include day before month start

        const bufferEnd = new Date(endOfMonth);
        bufferEnd.setDate(bufferEnd.getDate() + 1); // Include day after month end

        let query = supabase
          .from('signals' as any)
          .select('*')
          .gte('created_at', bufferStart.toISOString())
          .lte('created_at', bufferEnd.toISOString())
          .order('created_at', { ascending: true });

        const { data: signals, error: signalsError } = await query;

        if (signalsError) {
          console.error('Error fetching signals:', signalsError);
          setError('Failed to load signal data');
          return;
        }

        console.log('Calendar - Fetched signals:', signals);
        console.log('Calendar - Date range:', {
          startOfMonth: startOfMonth.toISOString(),
          endOfMonth: endOfMonth.toISOString(),
          bufferStart: bufferStart.toISOString(),
          bufferEnd: bufferEnd.toISOString(),
          currentMonth: month.getMonth() + 1,
          currentYear: month.getFullYear()
        });

        // Group signals by date and calculate daily stats
        const dailyMap = new Map<string, DailySignalData>();

        (signals || []).forEach((signal: any) => {
          // Use local date formatting to avoid timezone issues
          const signalDateObj = new Date(signal.created_at);
          const signalDate =
            signalDateObj.getFullYear() +
            '-' +
            String(signalDateObj.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(signalDateObj.getDate()).padStart(2, '0');

          // Check if signal date is within the current month for display
          const isInCurrentMonth =
            signalDateObj >= startOfMonth && signalDateObj <= endOfMonth;

          console.log('Calendar - Processing signal:', {
            id: signal.id,
            symbol: signal.symbol,
            created_at: signal.created_at,
            signalDate: signalDate,
            pnl_percentage: signal.pnl_percentage || 0,
            isInCurrentMonth: isInCurrentMonth
          });

          // Only process signals that are in the current month for display
          if (isInCurrentMonth) {
            if (!dailyMap.has(signalDate)) {
              dailyMap.set(signalDate, {
                date: signalDate,
                signals: 0,
                totalGain: 0,
                averageGain: 0,
                wins: 0,
                losses: 0
              });
            }

            const dayData = dailyMap.get(signalDate)!;
            dayData.signals += 1;
            dayData.totalGain += signal.pnl_percentage || 0;

            if (signal.pnl_percentage > 0) {
              dayData.wins += 1;
            } else if (signal.pnl_percentage < 0) {
              dayData.losses += 1;
            }
          }
        });

        // Calculate average gains for each day
        dailyMap.forEach((dayData) => {
          dayData.averageGain =
            dayData.signals > 0 ? dayData.totalGain / dayData.signals : 0;
        });

        setDailyData(Array.from(dailyMap.values()));

        // Generate calendar days first
        const daysInMonth = getDaysInMonth(month);
        const firstDay = getFirstDayOfMonth(month);
        const days: (Date | null)[] = [];

        // Add days from previous month
        const prevMonth = new Date(
          month.getFullYear(),
          month.getMonth() - 1,
          0
        );
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
          days.push(
            new Date(
              month.getFullYear(),
              month.getMonth() - 1,
              daysInPrevMonth - i
            )
          );
        }

        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
          days.push(new Date(month.getFullYear(), month.getMonth(), day));
        }

        // Add days from next month to complete the calendar grid
        const totalDaysSoFar = days.length;
        const daysNeededToCompleteWeeks =
          Math.ceil(totalDaysSoFar / 7) * 7 - totalDaysSoFar;
        for (let day = 1; day <= daysNeededToCompleteWeeks; day++) {
          days.push(new Date(month.getFullYear(), month.getMonth() + 1, day));
        }

        // Calculate weekly data based on the actual calendar grid
        const weeklyData: WeeklySignalData[] = [];

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
              const weekData: WeeklySignalData = {
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
                signals: 0,
                totalGain: 0,
                averageGain: 0,
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
                    weekData.signals += dayStats.signals;
                    weekData.totalGain += dayStats.totalGain;
                    weekData.wins += dayStats.wins;
                    weekData.losses += dayStats.losses;
                  }
                }
              });

              // Use total gain directly (no division needed)
              weekData.averageGain = weekData.totalGain;

              weeklyData.push(weekData);
            }
          } else {
            // Empty week - still add it for proper alignment
            weeklyData.push({
              weekStart: '',
              weekEnd: '',
              signals: 0,
              totalGain: 0,
              averageGain: 0,
              wins: 0,
              losses: 0,
              weekNumber: weekIndex + 1
            });
          }
        }

        setWeeklyData(weeklyData);
      } catch (err) {
        console.error('Error fetching signals:', err);
        setError('Failed to load signal data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignalsForMonth();
  }, [month, supabase, refreshKey]);

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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const getPerformanceColor = (gain: number) => {
    if (gain > 0)
      return 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-400/50';
    if (gain < 0)
      return 'bg-gradient-to-br from-red-500/20 to-rose-500/20 text-red-400 border-red-400/50';
    return 'bg-slate-700/30 text-slate-400 border-slate-600/50';
  };

  // Generate calendar days for display
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

  // Add days from next month to complete the calendar grid
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

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CalendarDaysIcon className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-slate-400">Loading signal data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FireIcon className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-red-400 mb-2">Error loading signals</p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </h3>
          <p className="text-slate-400 text-sm flex items-center">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Signal Performance Calendar
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-200 group"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-200 group"
          >
            <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative z-10">
        {/* Day Headers */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-slate-400 py-2"
            >
              {day}
            </div>
          ))}
          <div className="text-center text-sm font-medium text-slate-400 py-2">
            Week
          </div>
        </div>

        {/* Calendar Days */}
        <div className="space-y-2">
          {Array.from(
            { length: Math.ceil(days.length / 7) },
            (_, weekIndex) => {
              const weekDays = days.slice(weekIndex * 7, (weekIndex + 1) * 7);
              const weekData = weeklyData[weekIndex];

              return (
                <div key={weekIndex} className="grid grid-cols-8 gap-2">
                  {weekDays.map((day, dayIndex) => {
                    if (!day)
                      return <div key={dayIndex} className="h-20"></div>;

                    // Determine if this day belongs to current month, previous month, or next month
                    const isCurrentMonth = day.getMonth() === month.getMonth();
                    const isPreviousMonth =
                      day.getMonth() === month.getMonth() - 1;
                    const isNextMonth = day.getMonth() === month.getMonth() + 1;

                    const dayStats = getStatsForDate(day);
                    const isSelected =
                      selectedDate?.getTime() === day.getTime();

                    return (
                      <div
                        key={dayIndex}
                        className={`relative h-20 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${
                          isSelected
                            ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/25'
                            : dayStats
                              ? getPerformanceColor(dayStats.totalGain)
                              : isCurrentMonth
                                ? 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-600/40'
                                : 'opacity-50 text-slate-500 bg-slate-800/10 border-slate-700/30'
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        {/* Day Number */}
                        <div
                          className={`absolute top-2 left-2 text-sm font-semibold ${
                            isCurrentMonth ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {day.getDate()}
                        </div>

                        {/* Signal Indicators */}
                        {dayStats && isCurrentMonth && (
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-1">
                                <ChartBarIcon className="h-3 w-3" />
                                <span>{dayStats.signals}</span>
                              </div>
                              <div
                                className={`font-medium ${
                                  dayStats.totalGain >= 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {dayStats.totalGain >= 0 ? '+' : ''}
                                {dayStats.totalGain.toFixed(2)}R
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hover Effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      </div>
                    );
                  })}

                  {/* Weekly Performance Column */}
                  <div className="h-20 rounded-xl bg-slate-700/30 border border-slate-600/50 flex flex-col items-center justify-center p-2">
                    {weekData && weekData.signals > 0 ? (
                      <>
                        <div className="text-xs text-slate-300 font-medium mb-1">
                          Week {weekData.weekNumber}
                        </div>
                        <div className="text-xs text-slate-400 mb-1">
                          {weekData.signals} signals
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            weekData.totalGain >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {weekData.totalGain >= 0 ? '+' : ''}
                          {weekData.totalGain.toFixed(2)}R
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">-</div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {(() => {
            const stats = getStatsForDate(selectedDate);
            if (!stats) {
              return (
                <div className="text-center py-4">
                  <CalendarDaysIcon className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400">No signals on this day</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-slate-600/30 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {stats.signals}
                  </div>
                  <div className="text-xs text-slate-400">Signals</div>
                </div>
                <div className="text-center p-3 bg-slate-600/30 rounded-lg">
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      stats.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {stats.totalGain >= 0 ? '+' : ''}
                    {stats.totalGain.toFixed(2)}R
                  </div>
                  <div className="text-xs text-slate-400">Total RR</div>
                </div>
                <div className="text-center p-3 bg-slate-600/30 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">
                    {stats.wins}
                  </div>
                  <div className="text-xs text-slate-400">Wins</div>
                </div>
                <div className="text-center p-3 bg-slate-600/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {stats.losses}
                  </div>
                  <div className="text-xs text-slate-400">Losses</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
