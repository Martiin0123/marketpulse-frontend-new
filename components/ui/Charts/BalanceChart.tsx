'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity
} from 'lucide-react';
import { Database } from '@/types_db';

// Dynamically import Chart to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-80">
      <div className="text-gray-400">Loading chart...</div>
    </div>
  )
});

type Position = Database['public']['Tables']['positions']['Row'];

interface BalanceChartProps {
  positions: Position[];
  accountSize: number;
}

interface BalanceDataPoint {
  date: string;
  balance: number;
  timestamp: number;
  type: 'entry' | 'exit';
  position: Position;
}

export default function BalanceChart({
  positions,
  accountSize
}: BalanceChartProps) {
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>(
    '3M'
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { balanceData, stats, chartOptions, series } = useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        balanceData: [],
        stats: {
          currentBalance: accountSize,
          totalReturn: 0,
          totalReturnPercent: 0,
          winRate: 0,
          totalTrades: 0,
          maxDrawdown: 0,
          openPositions: 0,
          totalPositions: 0
        },
        chartOptions: {},
        series: []
      };
    }

    // Helper function to get entry timestamp
    const getEntryTimestamp = (position: Position) => {
      // Handle both entry_timestamp (Unix) and entry_time (ISO string)
      if (position.entry_timestamp) {
        return position.entry_timestamp;
      }
      if ((position as any).entry_time) {
        return Math.floor(
          new Date((position as any).entry_time).getTime() / 1000
        );
      }
      // Fallback to created_at
      return position.created_at
        ? Math.floor(new Date(position.created_at).getTime() / 1000)
        : Date.now() / 1000;
    };

    // Helper function to get exit timestamp
    const getExitTimestamp = (position: Position) => {
      // Handle both exit_timestamp (Unix) and exit_time (ISO string)
      if (position.exit_timestamp) {
        return position.exit_timestamp;
      }
      if ((position as any).exit_time) {
        return Math.floor(
          new Date((position as any).exit_time).getTime() / 1000
        );
      }
      return null;
    };

    // Filter positions by timeframe
    const now = new Date();
    const timeframeMs: Record<string, number> = {
      '1M': 30 * 24 * 60 * 60 * 1000,
      '3M': 90 * 24 * 60 * 60 * 1000,
      '6M': 180 * 24 * 60 * 60 * 1000,
      '1Y': 365 * 24 * 60 * 60 * 1000
    };

    const cutoffDate =
      timeframe === 'ALL'
        ? new Date(0)
        : new Date(now.getTime() - timeframeMs[timeframe]);

    // Filter and sort positions by entry time
    const relevantPositions = positions
      .filter((pos) => {
        const entryTimestamp = getEntryTimestamp(pos);
        const positionDate = new Date(entryTimestamp * 1000);
        return positionDate >= cutoffDate;
      })
      .sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));

    // Separate closed and open positions
    const closedPositions = relevantPositions.filter(
      (pos) => pos.status === 'closed'
    );
    const openPositions = relevantPositions.filter(
      (pos) => pos.status === 'open'
    );

    // Debug logging
    console.log('BalanceChart Debug:', {
      totalPositions: positions.length,
      relevantPositions: relevantPositions.length,
      closedPositions: closedPositions.length,
      openPositions: openPositions.length,
      timeframe,
      sampleClosedPosition: closedPositions[0],
      sampleOpenPosition: openPositions[0],
      sampleEntryTimestamp: closedPositions[0]
        ? getEntryTimestamp(closedPositions[0])
        : null,
      sampleExitTimestamp: closedPositions[0]
        ? getExitTimestamp(closedPositions[0])
        : null
    });

    // Build comprehensive balance progression
    const balanceData: BalanceDataPoint[] = [];
    let runningBalance = accountSize;

    // Helper function to get date string from timestamp
    const getDateFromTimestamp = (
      timestamp: number | null,
      fallback: number
    ) => {
      const ts = timestamp || fallback;
      return new Date(ts * 1000).toLocaleDateString();
    };

    // If we have no closed positions but have open positions,
    // create a minimal chart showing position entries
    if (closedPositions.length === 0 && openPositions.length > 0) {
      // Start with account balance
      const firstEntryTimestamp = getEntryTimestamp(openPositions[0]);
      balanceData.push({
        date: new Date(firstEntryTimestamp * 1000).toLocaleDateString(),
        balance: accountSize,
        timestamp: firstEntryTimestamp * 1000,
        type: 'entry',
        position: openPositions[0]
      });

      // Add entry points for each open position to show trading activity
      openPositions.forEach((position, index) => {
        const entryTimestamp = getEntryTimestamp(position);
        balanceData.push({
          date: new Date(entryTimestamp * 1000).toLocaleDateString(),
          balance: accountSize, // Keep balance flat since no realized P&L yet
          timestamp: entryTimestamp * 1000,
          type: 'entry',
          position
        });
      });
    } else if (closedPositions.length > 0) {
      // Add initial balance point
      const firstEntryTimestamp = getEntryTimestamp(closedPositions[0]);
      balanceData.push({
        date: new Date(firstEntryTimestamp * 1000).toLocaleDateString(),
        balance: accountSize,
        timestamp: firstEntryTimestamp * 1000,
        type: 'entry',
        position: closedPositions[0]
      });

      // Process closed positions for actual P&L progression
      closedPositions.forEach((position) => {
        const pnlPercent = position.pnl || 0;
        const pnlDollar = (pnlPercent / 100) * accountSize;
        runningBalance += pnlDollar;

        const exitTimestamp = getExitTimestamp(position);
        const entryTimestamp = getEntryTimestamp(position);
        const finalTimestamp = exitTimestamp || entryTimestamp;

        balanceData.push({
          date: getDateFromTimestamp(exitTimestamp, entryTimestamp),
          balance: runningBalance,
          timestamp: finalTimestamp * 1000,
          type: 'exit',
          position
        });
      });
    }

    // Calculate statistics
    const totalClosedPnL = closedPositions.reduce(
      (sum, pos) => sum + (pos.pnl || 0),
      0
    );
    const totalReturn = (totalClosedPnL / 100) * accountSize;
    const totalReturnPercent = totalClosedPnL;

    const winningTrades = closedPositions.filter(
      (p) => (p.pnl || 0) > 0
    ).length;
    const winRate =
      closedPositions.length > 0
        ? (winningTrades / closedPositions.length) * 100
        : 0;

    // Calculate max drawdown
    let peak = accountSize;
    let maxDrawdown = 0;
    let currentBalance = accountSize;

    closedPositions.forEach((position) => {
      const pnlDollar = ((position.pnl || 0) / 100) * accountSize;
      currentBalance += pnlDollar;

      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const drawdown = ((peak - currentBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Chart options with better handling for minimal data
    const chartOptions = {
      chart: {
        type: 'area' as const,
        height: 350,
        toolbar: {
          show: false
        },
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      theme: {
        mode: 'dark' as const
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth' as const,
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.1,
          stops: [0, 100]
        }
      },
      grid: {
        show: true,
        borderColor: '#374151',
        strokeDashArray: 3,
        padding: {
          left: 20,
          right: 20
        }
      },
      xaxis: {
        type: 'datetime' as const,
        categories:
          balanceData.length > 0
            ? balanceData.map((d: BalanceDataPoint) => d.timestamp)
            : [],
        labels: {
          style: {
            colors: '#9CA3AF'
          }
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#9CA3AF'
          },
          formatter: (value: number) => `$${value.toLocaleString()}`
        }
      },
      colors: [totalReturn >= 0 ? '#10B981' : '#EF4444'],
      tooltip: {
        theme: 'dark',
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: (
            value: number,
            { dataPointIndex }: { dataPointIndex: number }
          ) => {
            if (dataPointIndex > 0 && balanceData[dataPointIndex]) {
              const currentPoint = balanceData[dataPointIndex];
              const prevBalance =
                balanceData[dataPointIndex - 1]?.balance || accountSize;
              const change = value - prevBalance;
              const changePercent =
                prevBalance > 0 ? (change / prevBalance) * 100 : 0;

              return `$${value.toLocaleString()}<br/>
                     Symbol: ${currentPoint.position?.symbol || 'N/A'}<br/>
                     Side: ${currentPoint.position?.side || 'N/A'}<br/>
                     Type: ${currentPoint.type}<br/>
                     Change: ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            }
            return `$${value.toLocaleString()}<br/>Starting Balance`;
          }
        }
      }
    };

    const series = [
      {
        name: 'Account Balance',
        data: balanceData.map((d: BalanceDataPoint) => d.balance)
      }
    ];

    return {
      balanceData,
      stats: {
        currentBalance: runningBalance,
        totalReturn,
        totalReturnPercent,
        winRate,
        totalTrades: closedPositions.length,
        maxDrawdown,
        openPositions: openPositions.length,
        totalPositions: relevantPositions.length
      },
      chartOptions,
      series
    };
  }, [positions, accountSize, timeframe]);

  const timeframes = ['1M', '3M', '6M', '1Y', 'ALL'] as const;

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Account Balance</h2>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-gray-400 text-sm">Balance</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            ${stats.currentBalance.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            {stats.totalReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-gray-400 text-sm">Total Return</span>
          </div>
          <div
            className={`text-xl font-bold mt-1 ${
              stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {stats.totalReturnPercent >= 0 ? '+' : ''}
            {stats.totalReturnPercent.toFixed(1)}%
          </div>
          <div
            className={`text-sm ${stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {stats.totalReturn >= 0 ? '+' : ''}$
            {Math.abs(stats.totalReturn).toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Win Rate</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">
            {stats.totalTrades} closed
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <span className="text-gray-400 text-sm">Open Positions</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {stats.openPositions || 0}
          </div>
          <div className="text-sm text-gray-400">
            {stats.totalPositions} total
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-gray-400 text-sm">Max Drawdown</span>
          </div>
          <div className="text-xl font-bold text-red-400 mt-1">
            -{stats.maxDrawdown.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {!isMounted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading chart...</div>
          </div>
        ) : balanceData.length > 0 ? (
          <div className="w-full h-full">
            <Chart
              options={chartOptions}
              series={series}
              type="area"
              height="100%"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">
                No trading data available for selected timeframe
              </div>
              <div className="text-gray-500 text-sm">
                Adjust the timeframe or generate sample data to see the chart
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Summary */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Chart Data Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Positions:</span>
            <span className="text-white ml-2">{stats.totalPositions || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Closed Positions:</span>
            <span className="text-white ml-2">{stats.totalTrades}</span>
          </div>
          <div>
            <span className="text-gray-400">Open Positions:</span>
            <span className="text-white ml-2">{stats.openPositions || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Data Points:</span>
            <span className="text-white ml-2">{balanceData.length}</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {stats.totalTrades > 0 ? (
            <>
              Chart shows account balance progression based on realized P&L from
              closed positions. Each data point represents a completed trade.
            </>
          ) : stats.openPositions > 0 ? (
            <>
              Chart shows position entry points. No realized P&L yet as all
              positions are open. Balance will update as positions are closed.
            </>
          ) : (
            <>
              No position data available. Generate sample data or create
              positions to see chart progression.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
