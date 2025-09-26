'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { DailyStats } from '@/types/journal';

interface TradeCalendarProps {
  stats: DailyStats[];
  month: Date;
  onMonthChange: (month: Date) => void;
}

export default function TradeCalendar({
  stats,
  month,
  onMonthChange
}: TradeCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    return stats.find((stat) => stat.date === dateStr);
  };

  const getPerformanceColor = (rr: number) => {
    if (rr > 0) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (rr < 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
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

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-slate-400 p-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="h-12" />;
          }

          const dayStats = getStatsForDate(day);
          const isSelected =
            selectedDate && day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day)}
              className={`h-12 p-1 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-blue-600 border-blue-500'
                  : dayStats
                    ? getPerformanceColor(dayStats.rr)
                    : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="text-xs font-medium">{day.getDate()}</div>
              {dayStats && (
                <div className="text-xs">
                  {dayStats.trades > 0 && (
                    <div className="text-xs">{dayStats.trades}T</div>
                  )}
                  {dayStats.rr !== 0 && (
                    <div className="text-xs">
                      {dayStats.rr > 0 ? '+' : ''}
                      {dayStats.rr.toFixed(1)}R
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">
            {selectedDate.toLocaleDateString()}
          </h4>
          {getStatsForDate(selectedDate) ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Trades:</span>
                <span className="text-white ml-2">
                  {getStatsForDate(selectedDate)?.trades || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-400">R:R:</span>
                <span className="text-white ml-2">
                  {getStatsForDate(selectedDate)?.rr.toFixed(1) || '0.0'}R
                </span>
              </div>
              <div>
                <span className="text-slate-400">Wins:</span>
                <span className="text-green-400 ml-2">
                  {getStatsForDate(selectedDate)?.wins || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Losses:</span>
                <span className="text-red-400 ml-2">
                  {getStatsForDate(selectedDate)?.losses || 0}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No trades on this date</p>
          )}
        </div>
      )}
    </div>
  );
}
