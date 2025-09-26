'use client';

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  trend = 'neutral',
  trendValue
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up')
      return <ArrowUpIcon className="h-4 w-4 text-green-400" />;
    if (trend === 'down')
      return <ArrowDownIcon className="h-4 w-4 text-red-400" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {value}
            {subtitle && (
              <span className="text-sm font-normal text-slate-400 ml-1">
                {subtitle}
              </span>
            )}
          </p>
        </div>
        {trend !== 'neutral' && trendValue && (
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
