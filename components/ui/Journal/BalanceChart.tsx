'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { TradeEntry } from '@/types/journal';

interface BalanceChartProps {
  accountId: string | null; // null for combined view
  currency: string;
  initialBalance: number;
  className?: string;
}

interface BalancePoint {
  date: string;
  balance: number;
  trades: number;
}

export default function BalanceChart({
  accountId,
  currency,
  initialBalance,
  className = ''
}: BalanceChartProps) {
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<BalancePoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const supabase = createClient();

  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the last 30 days of trades
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .gte('entry_date', thirtyDaysAgo.toISOString())
          .eq('status', 'closed')
          .order('entry_date', { ascending: true });

        // If accountId is provided, filter by account
        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: trades, error: tradesError } = await query;

        if (tradesError) {
          console.error(
            'Error fetching trades for balance chart:',
            tradesError
          );
          setError('Failed to load balance data');
          return;
        }

        const closedTrades = (trades || []) as any[];

        // Group trades by date and calculate running balance
        const balanceMap = new Map<string, { pnl: number; trades: number }>();

        closedTrades.forEach((trade) => {
          const date = new Date(trade.entry_date).toISOString().split('T')[0];
          const existing = balanceMap.get(date) || { pnl: 0, trades: 0 };
          balanceMap.set(date, {
            pnl: existing.pnl + (trade.pnl || 0),
            trades: existing.trades + 1
          });
        });

        // Convert to array and calculate running balance
        const balancePoints: BalancePoint[] = [];
        let runningBalance = initialBalance;

        // Get all dates from the last 30 days
        const dates = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }

        dates.forEach((date) => {
          const dayData = balanceMap.get(date);
          if (dayData) {
            runningBalance += dayData.pnl;
            balancePoints.push({
              date,
              balance: runningBalance,
              trades: dayData.trades
            });
          } else {
            balancePoints.push({
              date,
              balance: runningBalance,
              trades: 0
            });
          }
        });

        setBalanceData(balancePoints);
      } catch (err) {
        console.error('Error in fetchBalanceData:', err);
        setError('Failed to load balance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalanceData();
  }, [accountId, initialBalance, supabase]);

  if (isLoading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (balanceData.length === 0) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">Balance Chart</h3>
        <div className="text-center text-slate-400">
          <p>No trading data available for the last 30 days</p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions and scaling (TradeZella style)
  const maxBalance = Math.max(...balanceData.map((d) => d.balance));
  const minBalance = Math.min(...balanceData.map((d) => d.balance));
  const balanceRange = maxBalance - minBalance;

  // More sophisticated padding calculation
  const padding =
    balanceRange > 0 ? balanceRange * 0.15 : Math.abs(initialBalance) * 0.1;
  const chartMin = Math.min(initialBalance, minBalance) - padding;
  const chartMax = Math.max(initialBalance, maxBalance) + padding;

  // Ensure we don't go below zero unless necessary
  const finalChartMin =
    chartMin < 0 && initialBalance > 0 ? Math.min(0, chartMin) : chartMin;

  const chartHeight = 200;
  const chartWidth = 400; // Increased width for better visibility
  const chartPadding = 20; // Increased padding for better spacing

  // Helper function to get Y position
  const getY = (balance: number) => {
    return (
      chartHeight -
      ((balance - finalChartMin) / (chartMax - finalChartMin)) * chartHeight
    );
  };

  // Helper function to get X position - distribute points across full width
  const getX = (index: number) => {
    if (balanceData.length === 1) {
      return chartWidth / 2; // Center single point
    }
    if (balanceData.length === 2) {
      // For 2 points, place them at 25% and 75% of the width
      return (
        chartPadding + (index * 0.5 + 0.25) * (chartWidth - chartPadding * 2)
      );
    }
    // For 3+ points, distribute evenly across the full width with padding
    const availableWidth = chartWidth - chartPadding * 2;
    return chartPadding + (index / (balanceData.length - 1)) * availableWidth;
  };

  // Generate SVG path for the balance line
  const pathData = balanceData
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.balance);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Calculate current balance
  const currentBalance =
    balanceData[balanceData.length - 1]?.balance || initialBalance;
  const totalPnL = currentBalance - initialBalance;
  const isProfit = totalPnL >= 0;

  return (
    <div
      className={`bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-2xl ${className}`}
    >
      {/* Header with enhanced styling */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Daily Net Cumulative P&L
            </h3>
            <p className="text-sm text-slate-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Last 30 days performance
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400 mb-1">Current Balance</div>
          <div
            className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'} transition-colors duration-300`}
          >
            {currency} {currentBalance.toLocaleString()}
          </div>
          <div
            className={`text-sm font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'} flex items-center justify-end`}
          >
            <span className="mr-1">{isProfit ? '↗' : '↘'}</span>
            {isProfit ? '+' : ''}
            {totalPnL.toLocaleString()} (
            {((totalPnL / initialBalance) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Enhanced chart container */}
      <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-xl p-6 border border-slate-700/30 shadow-inner chart-container">
        <svg
          width="100%"
          height={chartHeight + 60}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
          className="overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Enhanced gradient definitions */}
          <defs>
            <linearGradient
              id="chartGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={isProfit ? '#10b981' : '#ef4444'}
                stopOpacity="0.2"
              />
              <stop
                offset="50%"
                stopColor={isProfit ? '#10b981' : '#ef4444'}
                stopOpacity="0.1"
              />
              <stop
                offset="100%"
                stopColor={isProfit ? '#10b981' : '#ef4444'}
                stopOpacity="0.05"
              />
            </linearGradient>

            {/* Enhanced grid pattern */}
            <pattern
              id="grid"
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 25 0 L 0 0 0 25"
                fill="none"
                stroke="#374151"
                strokeWidth="0.5"
                opacity="0.15"
              />
            </pattern>

            {/* Glow effect for the line */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Enhanced horizontal grid lines */}
          {[
            { level: chartMax, opacity: 0.3, strokeWidth: 1 },
            {
              level: (chartMax + initialBalance) / 2,
              opacity: 0.2,
              strokeWidth: 1
            },
            {
              level: initialBalance,
              opacity: 0.6,
              strokeWidth: 2,
              dashArray: '4,2'
            },
            {
              level: (initialBalance + finalChartMin) / 2,
              opacity: 0.2,
              strokeWidth: 1
            },
            { level: finalChartMin, opacity: 0.3, strokeWidth: 1 }
          ].map((line, index) => (
            <line
              key={index}
              x1="0"
              y1={getY(line.level)}
              x2={chartWidth}
              y2={getY(line.level)}
              stroke={line.level === initialBalance ? '#6b7280' : '#374151'}
              strokeWidth={line.strokeWidth}
              strokeDasharray={line.dashArray}
              opacity={line.opacity}
            />
          ))}

          {/* Area under curve */}
          <path
            d={`${pathData} L ${getX(balanceData.length - 1)} ${getY(initialBalance)} L ${getX(0)} ${getY(initialBalance)} Z`}
            fill="url(#chartGradient)"
          />

          {/* Enhanced balance line with glow */}
          <path
            d={pathData}
            fill="none"
            stroke={isProfit ? '#10b981' : '#ef4444'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="transition-all duration-500"
          />

          {/* Data points with hover functionality */}
          {balanceData.map((point, index) => {
            const x = getX(index);
            const y = getY(point.balance);
            const isProfitPoint = point.balance >= initialBalance;
            const isSignificant =
              Math.abs(point.balance - initialBalance) > balanceRange * 0.1;

            return (
              <g key={point.date}>
                {/* Hover area */}
                <rect
                  x={x - 12}
                  y="0"
                  width="24"
                  height={chartHeight + 60}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredPoint(point);
                    const rect = e.currentTarget
                      .closest('.chart-container')
                      ?.getBoundingClientRect();
                    if (rect) {
                      setMousePosition({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget
                      .closest('.chart-container')
                      ?.getBoundingClientRect();
                    if (rect) {
                      setMousePosition({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* Outer glow circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSignificant ? '8' : '6'}
                  fill={isProfitPoint ? '#10b981' : '#ef4444'}
                  opacity="0.2"
                />

                {/* Main data point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSignificant ? '6' : '4'}
                  fill={isProfitPoint ? '#10b981' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-300 hover:r-8 hover:stroke-4"
                />

                {/* Inner highlight */}
                <circle cx={x} cy={y} r="2" fill="#ffffff" opacity="0.9" />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-none"
            style={{
              left: `${mousePosition.x + 10}px`,
              top: `${mousePosition.y - 10}px`
            }}
          >
            <div className="text-sm text-slate-300 mb-1">
              {new Date(hoveredPoint.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {currency} {hoveredPoint.balance.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">
              {hoveredPoint.trades} trade{hoveredPoint.trades !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-400">
              P&L: {currency}{' '}
              {(hoveredPoint.balance - initialBalance).toLocaleString()}
            </div>
          </div>
        )}

        {/* Enhanced X-axis labels */}
        <div className="flex justify-between mt-6 text-xs text-slate-300 px-4">
          <div className="flex items-center">
            <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-slate-400 mr-3"></div>
            <span className="font-semibold">
              {new Date(balanceData[0]?.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-semibold">
              {new Date(
                balanceData[balanceData.length - 1]?.date
              ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-400 ml-3"></div>
          </div>
        </div>
      </div>

      {/* Enhanced summary stats */}
      <div className="grid grid-cols-3 gap-6 mt-8">
        {[
          {
            title: 'Total Trades',
            value: balanceData.reduce((sum, point) => sum + point.trades, 0),
            subtitle: '30 days',
            icon: '📊',
            color: 'text-blue-400'
          },
          {
            title: 'Best Day',
            value: `${currency} ${Math.max(...balanceData.map((d) => d.balance - initialBalance)).toLocaleString()}`,
            subtitle: 'peak gain',
            icon: '🚀',
            color: 'text-green-400'
          },
          {
            title: 'Worst Day',
            value: `${currency} ${Math.min(...balanceData.map((d) => d.balance - initialBalance)).toLocaleString()}`,
            subtitle: 'max loss',
            icon: '⚠️',
            color: 'text-red-400'
          }
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-5 text-center border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300"
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-sm text-slate-400 mb-1">{stat.title}</div>
            <div className={`text-xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="text-xs text-slate-500">{stat.subtitle}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
