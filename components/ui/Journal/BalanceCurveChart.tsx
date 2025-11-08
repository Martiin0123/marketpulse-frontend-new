'use client';

import { useMemo, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface BalanceCurveChartProps {
  data: Array<{
    date: Date;
    balance: number;
    pnl: number;
  }>;
  onHover?: (
    point: { date: string; balance: number; trades: number } | null
  ) => void;
}

export default function BalanceCurveChart({
  data,
  onHover
}: BalanceCurveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const minBalance = Math.min(...data.map((d) => d.balance));
    const maxBalance = Math.max(...data.map((d) => d.balance));
    const range = maxBalance - minBalance;
    const padding = range * 0.15; // 15% padding for better visual

    const minY = minBalance - padding;
    const maxY = maxBalance + padding;

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

  const formatRR = (rr: number) => {
    if (isNaN(rr) || rr === null || rr === undefined) {
      return '0.00R';
    }
    const sign = rr >= 0 ? '+' : '';
    return `${sign}${rr.toFixed(2)}R`;
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
              {formatRR(label.value)}
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
        />

        {/* Data points with enhanced styling */}
        {chartData.points.map((point, index) => {
          const isHovered = hoveredIndex === index;
          const isLast = index === chartData.points.length - 1;

          return (
            <g key={index}>
              {/* Hover area (invisible but larger) */}
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  onHover?.({
                    date: data[index].date.toISOString().split('T')[0],
                    balance: point.balance, // This is actually RR now
                    trades: 1
                  });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  onHover?.(null);
                }}
              />

              {/* Data point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? '8' : isLast ? '6' : '4'}
                fill={point.pnl >= 0 ? '#10b981' : '#ef4444'}
                stroke="white"
                strokeWidth={isHovered ? '3' : '2'}
                className={`transition-all duration-300 ${isHovered ? 'drop-shadow-lg' : ''}`}
                filter={isHovered ? 'url(#dropshadow)' : 'none'}
              />

              {/* Inner glow for last point */}
              {isLast && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="2"
                  fill="white"
                  className="animate-pulse"
                />
              )}

              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={point.x - 50}
                    y={point.y - 80}
                    width="100"
                    height="60"
                    rx="12"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke="rgba(71, 85, 105, 0.5)"
                    strokeWidth="1"
                    filter="url(#dropshadow)"
                  />
                  <text
                    x={point.x}
                    y={point.y - 60}
                    textAnchor="middle"
                    className="text-sm fill-white font-bold"
                    fontSize="12"
                  >
                    {formatRR(point.balance)}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 45}
                    textAnchor="middle"
                    className={`text-xs font-medium ${point.pnl >= 0 ? 'fill-emerald-400' : 'fill-red-400'}`}
                    fontSize="10"
                  >
                    {formatRR(point.pnl)}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 30}
                    textAnchor="middle"
                    className="text-xs fill-slate-400"
                    fontSize="9"
                  >
                    {data[index].date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    })}
                  </text>
                </g>
              )}
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
