'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { Database } from '@/types_db';
import { ApexOptions } from 'apexcharts';

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
  accountSize?: number;
  showContainer?: boolean;
}

interface BalanceDataPoint {
  date: string;
  balance: number;
  timestamp: number;
  type: 'entry' | 'exit';
  position: Position;
}

// Helper function to calculate maximum drawdown
const calculateMaxDrawdown = (balances: number[]): number => {
  if (balances.length === 0) return 0;
  let peak = balances[0];
  let maxDrawdown = 0;

  balances.forEach((balance) => {
    if (balance > peak) {
      peak = balance;
    }
    const drawdown = ((peak - balance) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return maxDrawdown;
};

export default function BalanceChart({
  positions,
  accountSize = 10000,
  showContainer = true
}: BalanceChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { balanceData, stats, chartOptions, series } = useMemo(() => {
    if (!positions || positions.length === 0) {
      // Add default datapoint at 100%
      const defaultData = [
        {
          date: new Date().toLocaleDateString(),
          balance: 100,
          timestamp: Date.now(),
          type: 'entry' as const,
          position: {} as Position
        }
      ];

      return {
        balanceData: defaultData,
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
        chartOptions: {
          chart: {
            type: 'area' as const,
            height: '100%',
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent'
          },
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth' as const, width: 2 },
          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.45,
              opacityTo: 0.05,
              stops: [50, 100, 100]
            }
          },
          xaxis: {
            type: 'datetime' as const,
            categories: defaultData.map((d) => d.timestamp),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
          },
          yaxis: {
            min: 80,
            max: 120,
            tickAmount: 4,
            labels: {
              style: { colors: '#9ca3af' },
              formatter: function (value: number) {
                return value.toFixed(0) + '%';
              }
            }
          },
          tooltip: {
            x: { format: 'dd MMM yyyy' },
            y: {
              formatter: function (value: number) {
                return value.toFixed(1) + '%';
              }
            }
          },
          grid: {
            borderColor: '#374151',
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
          },
          theme: { mode: 'dark' as const }
        },
        series: [
          {
            name: 'Balance',
            data: defaultData.map((d) => ({ x: d.timestamp, y: d.balance }))
          }
        ]
      };
    }

    // Helper function to get entry timestamp
    const getEntryTimestamp = (position: Position) => {
      // Handle ISO string timestamps
      if (
        position.entry_timestamp &&
        typeof position.entry_timestamp === 'string'
      ) {
        return Math.floor(new Date(position.entry_timestamp).getTime() / 1000);
      }
      // Handle Unix timestamps
      if (
        position.entry_timestamp &&
        typeof position.entry_timestamp === 'number'
      ) {
        return position.entry_timestamp;
      }
      // Fallback to created_at
      return position.created_at
        ? Math.floor(new Date(position.created_at).getTime() / 1000)
        : Date.now() / 1000;
    };

    // Helper function to get exit timestamp
    const getExitTimestamp = (position: Position) => {
      // Handle ISO string timestamps
      if (
        position.exit_timestamp &&
        typeof position.exit_timestamp === 'string'
      ) {
        return Math.floor(new Date(position.exit_timestamp).getTime() / 1000);
      }
      // Handle Unix timestamps
      if (
        position.exit_timestamp &&
        typeof position.exit_timestamp === 'number'
      ) {
        return position.exit_timestamp;
      }
      return null;
    };

    // Filter and sort positions by entry time - only closed positions
    const relevantPositions = positions
      .filter((pos) => pos.status === 'closed')
      .sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));

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

    // Process all closed positions chronologically
    const allPositions = [...relevantPositions].sort((a, b) => {
      const aTime = getExitTimestamp(a) || getEntryTimestamp(a);
      const bTime = getExitTimestamp(b) || getEntryTimestamp(b);
      return aTime - bTime;
    });

    // Add initial balance point at 100% (account size)
    if (allPositions.length > 0) {
      const firstEntryTimestamp = getEntryTimestamp(allPositions[0]);
      balanceData.push({
        date: new Date(firstEntryTimestamp * 1000).toLocaleDateString(),
        balance: 100, // 100% represents the initial account size
        timestamp: firstEntryTimestamp * 1000,
        type: 'entry',
        position: allPositions[0]
      });
    }

    // Process each closed position
    let lastTimestamp = 0;
    allPositions.forEach((position, index) => {
      const pnlPercent = position.pnl || 0;
      const pnlDollar = (pnlPercent / 100) * accountSize;

      // Add PnL to running balance
      runningBalance += pnlDollar;

      const exitTimestamp = getExitTimestamp(position);
      const entryTimestamp = getEntryTimestamp(position);
      const finalTimestamp = exitTimestamp || entryTimestamp;

      // Only add point if timestamp is different or it's the last position
      if (
        finalTimestamp !== lastTimestamp ||
        index === allPositions.length - 1
      ) {
        // Convert balance to percentage (100% = initial account size)
        const balancePercent = (runningBalance / accountSize) * 100;

        balanceData.push({
          date: getDateFromTimestamp(exitTimestamp, entryTimestamp),
          balance: balancePercent,
          timestamp: finalTimestamp * 1000,
          type: 'exit',
          position
        });
        lastTimestamp = finalTimestamp;
      }
    });

    // Calculate stats
    const stats = {
      currentBalance: runningBalance,
      totalReturn: runningBalance - accountSize,
      totalReturnPercent: ((runningBalance - accountSize) / accountSize) * 100,
      winRate:
        relevantPositions.length > 0
          ? (relevantPositions.filter((p) => (p.pnl || 0) > 0).length /
              relevantPositions.length) *
            100
          : 0,
      totalTrades: relevantPositions.length,
      maxDrawdown: calculateMaxDrawdown(balanceData.map((d) => d.balance)),
      openPositions: 0,
      totalPositions: relevantPositions.length
    };

    // Chart options
    const chartOptions: ApexOptions = {
      chart: {
        type: 'area' as const,
        height: '100%',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        },
        background: 'transparent'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [50, 100, 100]
        }
      },
      xaxis: {
        type: 'datetime',
        categories: balanceData.map((d) => d.timestamp),
        labels: {
          show: false
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        min: 80, // 80% minimum
        max: 120, // 120% maximum
        tickAmount: 4,
        labels: {
          style: {
            colors: '#9ca3af'
          },
          formatter: function (value: number) {
            return value.toFixed(0) + '%';
          }
        }
      },
      tooltip: {
        x: {
          format: 'dd MMM yyyy'
        },
        y: {
          formatter: function (value: number) {
            return value.toFixed(1) + '%';
          }
        }
      },
      grid: {
        borderColor: '#374151',
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      theme: {
        mode: 'dark'
      }
    };

    // Series data
    const series = [
      {
        name: 'Balance',
        data: balanceData.map((d) => ({
          x: d.timestamp,
          y: d.balance
        }))
      }
    ];

    return {
      balanceData,
      stats,
      chartOptions,
      series
    };
  }, [positions, accountSize]);

  const chartContent = (
    <div className="h-full">
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
              No trading data available
            </div>
            <div className="text-gray-500 text-sm">
              Generate sample data to see the chart
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!showContainer) {
    return chartContent;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Account Balance</h2>
      </div>

      {/* Chart */}
      <div className="h-48">{chartContent}</div>
    </div>
  );
}
