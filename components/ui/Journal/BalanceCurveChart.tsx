'use client';

import { useMemo, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface BalanceCurveChartProps {
  data: Array<{
    date: Date;
    balance: number;
    pnl: number;
  }>;
  currency?: string;
  onHover?: (
    point: {
      date: Date | string;
      balance: number;
      pnl?: number;
      trades?: number;
    } | null
  ) => void;
}

export default function BalanceCurveChart({
  data,
  currency = 'USD',
  onHover
}: BalanceCurveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Helper function to round to nice intervals
  const roundToNiceNumber = (value: number, roundUp: boolean): number => {
    const absValue = Math.abs(value);
    const sign = value >= 0 ? 1 : -1;
    
    if (absValue === 0) return 0;
    
    // Determine the order of magnitude
    const magnitude = Math.floor(Math.log10(absValue));
    const normalized = absValue / Math.pow(10, magnitude);
    
    // Round to nice numbers: 1, 2, 5, 10, 20, 50, 100, etc.
    let niceNormalized: number;
    if (roundUp) {
      if (normalized <= 1) niceNormalized = 1;
      else if (normalized <= 2) niceNormalized = 2;
      else if (normalized <= 5) niceNormalized = 5;
      else niceNormalized = 10;
    } else {
      if (normalized >= 10) niceNormalized = 10;
      else if (normalized >= 5) niceNormalized = 5;
      else if (normalized >= 2) niceNormalized = 2;
      else niceNormalized = 1;
    }
    
    return sign * niceNormalized * Math.pow(10, magnitude);
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const minBalance = Math.min(...data.map((d) => d.balance));
    const maxBalance = Math.max(...data.map((d) => d.balance));
    const range = maxBalance - minBalance;
    const padding = range * 0.15; // 15% padding for better visual

    // Round min and max to nice numbers
    const minY = roundToNiceNumber(minBalance - padding, false);
    const maxY = roundToNiceNumber(maxBalance + padding, true);

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Convert data to SVG coordinates
    const points = data.map((point, index) => {
      const x = margin.left + (index / (data.length - 1)) * chartWidth;
      const y =
        margin.top +
        chartHeight -
        ((point.balance - minY) / (maxY - minY)) * chartHeight;
      return { x, y, ...point };
    });

    // Create smooth cubic bezier path
    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const prevPoint = points[index - 1];
      const cp1x = prevPoint.x + (point.x - prevPoint.x) * 0.3;
      const cp1y = prevPoint.y;
      const cp2x = point.x - (point.x - prevPoint.x) * 0.3;
      const cp2y = point.y;

      return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, '');

    // Create area path for gradient fill
    const areaPath = `${pathData} L ${margin.left + chartWidth} ${margin.top + chartHeight} L ${margin.left} ${margin.top + chartHeight} Z`;

    // Generate Y-axis labels
    const yLabels = [];
    const numLabels = 5;
    for (let i = 0; i <= numLabels; i++) {
      const value = minY + (maxY - minY) * (i / numLabels);
      const y = margin.top + chartHeight - (i / numLabels) * chartHeight;
      yLabels.push({ value, y });
    }

    // Generate X-axis labels
    const xLabels = [];
    const numXLabels = Math.min(6, data.length);

    // Only generate labels if we have data
    if (data.length > 0) {
      for (let i = 0; i < numXLabels; i++) {
        let index;
        if (data.length === 1) {
          // Special case for single data point
          index = 0;
        } else {
          index = Math.floor((i / (numXLabels - 1)) * (data.length - 1));
        }

        const point = points[index];
        const dataPoint = data[index];

        // Ensure we have valid data at this index
        if (dataPoint && point) {
          xLabels.push({
            value: dataPoint.date,
            x: point.x,
            label: dataPoint.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          });
        }
      }
    }

    return {
      points,
      pathData,
      areaPath,
      width,
      height,
      margin,
      chartWidth,
      chartHeight,
      yLabels,
      xLabels,
      minY,
      maxY
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return `${currency === 'USD' ? '$' : currency} 0.00`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">No data available</p>
          <p className="text-slate-500 text-sm mt-1">
            Start trading to see your RR progression
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-2xl p-6">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="overflow-visible"
      >
        <defs>
          {/* Enhanced gradients */}
          <linearGradient id="balanceArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="balanceLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Glow effect */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow */}
          <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="8"
              floodColor="#000000"
              floodOpacity="0.3"
            />
          </filter>
        </defs>

        {/* Grid lines */}
        {chartData.yLabels.map((label, index) => (
          <g key={index}>
            <line
              x1={chartData.margin.left}
              y1={label.y}
              x2={chartData.margin.left + chartData.chartWidth}
              y2={label.y}
              stroke="rgba(71, 85, 105, 0.15)"
              strokeWidth="1"
              strokeDasharray={
                index === 0 || index === chartData.yLabels.length - 1
                  ? 'none'
                  : '2,4'
              }
            />
            <text
              x={chartData.margin.left - 10}
              y={label.y + 4}
              textAnchor="end"
              className="text-xs fill-slate-500"
              fontSize="11"
            >
              {formatCurrency(label.value)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {chartData.xLabels.map((label, index) => (
          <text
            key={index}
            x={label.x}
            y={chartData.height - 10}
            textAnchor="middle"
            className="text-xs fill-slate-500"
            fontSize="10"
          >
            {label.label}
          </text>
        ))}

        {/* Area fill with enhanced gradient */}
        <path
          d={chartData.areaPath}
          fill="url(#balanceArea)"
          className="opacity-80"
          style={{ pointerEvents: 'none' }}
        />

        {/* Main line with glow effect */}
        <path
          d={chartData.pathData}
          fill="none"
          stroke="url(#balanceLine)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          className="drop-shadow-lg"
          style={{ pointerEvents: 'none' }}
        />

        {/* Data points with enhanced styling */}
        {chartData.points.map((point, index) => {
          const isHovered = hoveredIndex === index;
          const isLast = index === chartData.points.length - 1;

          return (
            <g key={index}>
              {/* Hover area (invisible but larger, rendered first so it's behind but captures events) */}
              <circle
                cx={point.x}
                cy={point.y}
                r="15"
                fill="transparent"
                className="cursor-pointer"
                style={{ pointerEvents: 'all' }}
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  // Pass the actual data point with correct balance (dollar amount) and daily PnL
                  const dailyPnL =
                    index > 0 ? point.balance - data[index - 1].balance : 0;
                  onHover?.({
                    date: data[index].date,
                    balance: point.balance, // Dollar balance (total cumulative)
                    pnl: dailyPnL, // Daily PnL for this point
                    trades: (data[index] as any).trades || 1
                  });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  onHover?.(null);
                }}
              />

              {/* Data point - also handles hover for better responsiveness */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? '8' : isLast ? '6' : '4'}
                fill={point.pnl >= 0 ? '#10b981' : '#ef4444'}
                stroke="white"
                strokeWidth={isHovered ? '3' : '2'}
                className={`cursor-pointer transition-all duration-300 ${isHovered ? 'drop-shadow-lg' : ''}`}
                filter={isHovered ? 'url(#dropshadow)' : 'none'}
                style={{ pointerEvents: 'all' }}
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  const dailyPnL =
                    index > 0 ? point.balance - data[index - 1].balance : 0;
                  onHover?.({
                    date: data[index].date,
                    balance: point.balance,
                    pnl: dailyPnL,
                    trades: (data[index] as any).trades || 1
                  });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  onHover?.(null);
                }}
              />

              {/* Inner glow for last point */}
              {isLast && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="white"
                  className="animate-pulse pointer-events-none"
                />
              )}

              {/* Tooltip removed - using custom tooltip in parent component */}
            </g>
          );
        })}

        {/* Performance indicator line */}
        {data.length > 1 && (
          <line
            x1={chartData.margin.left}
            y1={chartData.margin.top + chartData.chartHeight / 2}
            x2={chartData.margin.left + chartData.chartWidth}
            y2={chartData.margin.top + chartData.chartHeight / 2}
            stroke="rgba(71, 85, 105, 0.3)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}
      </svg>
    </div>
  );
}
