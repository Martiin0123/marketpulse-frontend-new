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

type Signal = Database['public']['Tables']['signals']['Row'];

interface BalanceChartProps {
  signals?: Signal[];
  customData?: { timestamp: number; value: number }[];
  showContainer?: boolean;
}

interface BalanceDataPoint {
  date: string;
  balance: number;
  timestamp: number;
  type: 'entry' | 'exit';
  signal: Signal;
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
  signals = [],
  customData,
  showContainer = true
}: BalanceChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { balanceData, stats, chartOptions, series } = useMemo(() => {
    // If customData is provided, use it directly
    if (customData && customData.length > 0) {
      const balanceData = customData.map((d) => ({
        date: new Date(d.timestamp).toLocaleDateString(),
        balance: d.value,
        timestamp: d.timestamp,
        type: 'entry',
        signal: {} as Signal
      }));
      return {
        balanceData,
        stats: {
          currentBalance:
            balanceData.length > 0
              ? balanceData[balanceData.length - 1].balance
              : 100,
          totalReturn:
            balanceData.length > 0
              ? balanceData[balanceData.length - 1].balance
              : 0,
          totalReturnPercent:
            balanceData.length > 0
              ? balanceData[balanceData.length - 1].balance
              : 0,
          winRate: 0,
          totalTrades: balanceData.length,
          maxDrawdown: calculateMaxDrawdown(balanceData.map((d) => d.balance)),
          activeSignals: 0,
          totalSignals: balanceData.length
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
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
          },
          yaxis: {
            min: Math.max(
              0,
              Math.min(...balanceData.map((d) => d.balance)) - 10
            ),
            max: Math.max(...balanceData.map((d) => d.balance)) + 10,
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
            name: 'Performance',
            data: balanceData.map((d) => ({ x: d.timestamp, y: d.balance }))
          }
        ]
      };
    }

    if (!signals || signals.length === 0) {
      return {
        balanceData: [],
        stats: {
          currentBalance: 100,
          totalReturn: 0,
          totalReturnPercent: 0,
          winRate: 0,
          totalTrades: 0,
          maxDrawdown: 0,
          activeSignals: 0,
          totalSignals: 0
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
            name: 'Performance',
            data: []
          }
        ]
      };
    }

    // Helper function to get entry timestamp
    const getEntryTimestamp = (signal: Signal) => {
      return signal.created_at
        ? new Date(signal.created_at).getTime()
        : Date.now();
    };

    // Helper function to get exit timestamp
    const getExitTimestamp = (signal: Signal) => {
      return signal.exit_timestamp
        ? new Date(signal.exit_timestamp).getTime()
        : null;
    };

    // Filter and sort signals by entry time - include ALL signals (buy, sell, short, close)
    const relevantSignals = signals
      .filter((signal) => signal.pnl_percentage !== null) // Only include signals with PnL data
      .sort((a, b) => getEntryTimestamp(a) - getEntryTimestamp(b));

    // Build balance progression with one data point per completed trade
    const balanceData: BalanceDataPoint[] = [];
    let runningBalance = 100; // Start at 100%

    // Helper function to get date string from timestamp
    const getDateFromTimestamp = (
      timestamp: number | null,
      fallback: number
    ) => {
      const ts = timestamp || fallback;
      return new Date(ts).toLocaleDateString();
    };

    // Filter only completed trades and sort chronologically
    const completedTrades = relevantSignals
      .filter(
        (signal) =>
          (signal.status === 'closed' || signal.status === 'executed') &&
          signal.pnl_percentage !== null
      )
      .sort((a, b) => {
        const aTime = getExitTimestamp(a) || getEntryTimestamp(a);
        const bTime = getExitTimestamp(b) || getEntryTimestamp(b);
        return aTime - bTime;
      });

    // Add initial balance point (100%)
    if (completedTrades.length > 0) {
      balanceData.push({
        date: 'Initial',
        balance: runningBalance,
        timestamp: getEntryTimestamp(completedTrades[0]) - 24 * 60 * 60 * 1000, // One day before first trade
        type: 'entry',
        signal: {} as Signal
      });
    }

    // Process each completed trade - one data point per trade
    completedTrades.forEach((signal, index) => {
      const exitTime = getExitTimestamp(signal) || getEntryTimestamp(signal);
      const pnlPercentage = signal.pnl_percentage || 0;

      // Calculate new balance after this trade
      const newBalance = runningBalance * (1 + pnlPercentage / 100);

      // Add data point for this trade
      balanceData.push({
        date: getDateFromTimestamp(exitTime, exitTime),
        balance: newBalance,
        timestamp: exitTime,
        type: 'exit',
        signal
      });

      // Update running balance for next trade
      runningBalance = newBalance;
    });

    // Calculate statistics
    const allCompletedTrades = relevantSignals.filter(
      (signal) =>
        (signal.status === 'closed' || signal.status === 'executed') &&
        signal.pnl_percentage !== null
    );
    const totalTrades = relevantSignals.length;
    const winningTrades = allCompletedTrades.filter(
      (signal) => (signal.pnl_percentage || 0) > 0
    ).length;
    const winRate =
      allCompletedTrades.length > 0
        ? (winningTrades / allCompletedTrades.length) * 100
        : 0;
    const totalReturn = runningBalance - 100;
    const totalReturnPercent = totalReturn;
    const maxDrawdown = calculateMaxDrawdown(balanceData.map((d) => d.balance));
    const activeSignals = signals.filter(
      (signal) => signal.status === 'active'
    ).length;

    // Chart options
    const chartOptions: ApexOptions = {
      chart: {
        type: 'area',
        height: '100%',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent'
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
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
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        min: Math.max(0, Math.min(...balanceData.map((d) => d.balance)) - 10),
        max: Math.max(...balanceData.map((d) => d.balance)) + 10,
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
      theme: { mode: 'dark' }
    };

    const series = [
      {
        name: 'Cumulative Balance',
        data: balanceData.map((d) => ({ x: d.timestamp, y: d.balance }))
      }
    ];

    return {
      balanceData,
      stats: {
        currentBalance: runningBalance,
        totalReturn,
        totalReturnPercent,
        winRate,
        totalTrades,
        maxDrawdown,
        activeSignals,
        totalSignals: signals.length
      },
      chartOptions,
      series
    };
  }, [signals, customData]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            Cumulative Balance (Starting at 100%)
          </h3>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Balance</span>
            </div>
          </div>
        </div>
        <div className="h-80">
          {signals && signals.length > 0 ? (
            <Chart
              options={chartOptions}
              series={series}
              type="area"
              height="100%"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <div className="text-lg font-medium mb-2">
                  No Completed Trades
                </div>
                <div className="text-sm">
                  Complete some trades to see cumulative balance progression
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <p className="text-sm font-medium text-slate-400">Total Return</p>
          <p
            className={`text-2xl font-bold ${stats.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {stats.totalReturnPercent >= 0 ? '+' : ''}
            {stats.totalReturnPercent.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500">Cumulative</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <p className="text-sm font-medium text-slate-400">Win Rate</p>
          <p className="text-2xl font-bold text-white">
            {stats.winRate.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">Completed trades</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <p className="text-sm font-medium text-slate-400">Completed Trades</p>
          <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
          <p className="text-xs text-slate-500">Total signals</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <p className="text-sm font-medium text-slate-400">Max Drawdown</p>
          <p className="text-2xl font-bold text-red-400">
            {stats.maxDrawdown.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500">Balance progression</p>
        </div>
      </div>
    </div>
  );

  return showContainer ? (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Balance Progression per Trade
        </h2>
      </div>
      {content}
    </div>
  ) : (
    content
  );
}
