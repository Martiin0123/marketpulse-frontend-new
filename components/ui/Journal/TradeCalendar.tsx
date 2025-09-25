import { DailyStats } from '@/types/journal';

interface TradeCalendarProps {
  stats: DailyStats[];
  month: Date;
  onMonthChange: (date: Date) => void;
}

export default function TradeCalendar({
  stats,
  month,
  onMonthChange
}: TradeCalendarProps) {
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  ).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const formatDate = (day: number) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date.toISOString().split('T')[0];
  };

  const getDayStats = (day: number) => {
    const date = formatDate(day);
    return stats.find((s) => s.date === date);
  };

  const getColorClass = (rr: number) => {
    if (rr > 2) return 'bg-green-500/30 border-green-500/30 text-green-400';
    if (rr > 1) return 'bg-green-500/20 border-green-500/20 text-green-400';
    if (rr > 0) return 'bg-green-500/10 border-green-500/10 text-green-400';
    if (rr < -2) return 'bg-red-500/30 border-red-500/30 text-red-400';
    if (rr < -1) return 'bg-red-500/20 border-red-500/20 text-red-400';
    if (rr < 0) return 'bg-red-500/10 border-red-500/10 text-red-400';
    return 'bg-slate-800 border-slate-700 text-slate-400';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-slate-300">Trade Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1))
            }
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-sm text-slate-400">
            {month.toLocaleString('default', {
              month: 'long',
              year: 'numeric'
            })}
          </span>
          <button
            onClick={() =>
              onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1))
            }
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-slate-400 py-2"
          >
            {day}
          </div>
        ))}
        {padding.map((i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const stats = getDayStats(day);
          return (
            <div
              key={day}
              className={`aspect-square p-1 rounded border ${
                stats
                  ? getColorClass(stats.rr)
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="h-full flex flex-col">
                <span className="text-xs">{day}</span>
                {stats && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {stats.rr > 0 ? '+' : ''}
                      {stats.rr.toFixed(1)}R
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
