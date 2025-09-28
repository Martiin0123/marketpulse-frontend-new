'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PrimeScopeScoreProps {
  accountId: string | null; // null for combined view
  className?: string;
}

interface ScoreMetrics {
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  overallScore: number;
}

export default function PrimeScopeScore({
  accountId,
  className = ''
}: PrimeScopeScoreProps) {
  const [metrics, setMetrics] = useState<ScoreMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const calculateScore = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all closed trades
        let query = supabase
          .from('trade_entries' as any)
          .select('*')
          .eq('status', 'closed')
          .order('entry_date', { ascending: true });

        if (accountId) {
          query = query.eq('account_id', accountId);
        }

        const { data: trades, error: tradesError } = await query;

        if (tradesError) {
          console.error('Error fetching trades for score:', tradesError);
          setError('Failed to load score data');
          return;
        }

        const closedTrades = (trades || []) as any[];

        if (closedTrades.length === 0) {
          setMetrics({
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            overallScore: 0
          });
          return;
        }

        // Calculate basic metrics
        const pnlValues = closedTrades.map((trade) => trade.pnl || 0);
        const wins = pnlValues.filter((pnl) => pnl > 0);
        const losses = pnlValues.filter((pnl) => pnl < 0);

        const totalTrades = closedTrades.length;
        const winTrades = wins.length;
        const lossTrades = losses.length;

        const averageWin =
          wins.length > 0
            ? wins.reduce((sum, pnl) => sum + pnl, 0) / wins.length
            : 0;
        const averageLoss =
          losses.length > 0
            ? Math.abs(
                losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length
              )
            : 0;

        const totalWins = wins.reduce((sum, pnl) => sum + pnl, 0);
        const totalLosses = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
        const profitFactor =
          totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

        // Calculate Maximum Drawdown
        let maxDrawdown = 0;
        let peak = 0;
        let current = 0;

        for (const pnl of pnlValues) {
          current += pnl;
          if (current > peak) {
            peak = current;
          }
          const drawdown = peak - current;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }

        // Calculate Sharpe Ratio (simplified - using P&L as returns)
        const meanReturn =
          pnlValues.reduce((sum, pnl) => sum + pnl, 0) / pnlValues.length;
        const variance =
          pnlValues.reduce(
            (sum, pnl) => sum + Math.pow(pnl - meanReturn, 2),
            0
          ) / pnlValues.length;
        const standardDeviation = Math.sqrt(variance);
        const sharpeRatio =
          standardDeviation > 0 ? meanReturn / standardDeviation : 0;

        // Calculate PrimeScope Score metrics (0-100 scale)
        // Profit Factor: 1.0 = 0, 2.0 = 50, 3.0+ = 100
        const profitFactorScore = Math.min(
          Math.max((profitFactor - 1) * 50, 0),
          100
        );

        // Sharpe Ratio: 0 = 0, 1.0 = 50, 2.0+ = 100
        const sharpeRatioScore = Math.min(Math.max(sharpeRatio * 50, 0), 100);

        // Max Drawdown: Lower is better, 0% = 100, 50%+ = 0
        const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
        const drawdownScore = Math.max(0, 100 - maxDrawdownPercent * 2);

        // Calculate overall score with industry-standard weights
        // Profit Factor: 40%, Sharpe Ratio: 35%, Max Drawdown: 25%
        const overallScore = Math.round(
          profitFactorScore * 0.4 +
            sharpeRatioScore * 0.35 +
            drawdownScore * 0.25
        );

        setMetrics({
          profitFactor: Math.max(0, Math.min(100, profitFactorScore)),
          sharpeRatio: Math.max(0, Math.min(100, sharpeRatioScore)),
          maxDrawdown: Math.max(0, Math.min(100, drawdownScore)),
          overallScore: Math.max(0, Math.min(100, overallScore))
        });
      } catch (err) {
        console.error('Error calculating score:', err);
        setError('Failed to calculate score');
      } finally {
        setIsLoading(false);
      }
    };

    calculateScore();
  }, [accountId, supabase]);

  if (isLoading) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 ${className}`}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div
        className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 ${className}`}
      >
        <div className="text-center text-red-400">
          <p>{error || 'Failed to load score'}</p>
        </div>
      </div>
    );
  }

  // Get score grade and color
  const getScoreGrade = (score: number) => {
    if (score >= 90)
      return {
        grade: 'A+',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20'
      };
    if (score >= 80)
      return {
        grade: 'A',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20'
      };
    if (score >= 70)
      return {
        grade: 'B+',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      };
    if (score >= 60)
      return {
        grade: 'B',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      };
    if (score >= 50)
      return {
        grade: 'C+',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20'
      };
    if (score >= 40)
      return {
        grade: 'C',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20'
      };
    if (score >= 30)
      return {
        grade: 'D+',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20'
      };
    if (score >= 20)
      return {
        grade: 'D',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20'
      };
    return { grade: 'F', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };

  const scoreGrade = getScoreGrade(metrics.overallScore);

  // Radar chart configuration for 3 metrics
  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  const metrics_labels = [
    'Profit Factor',
    'Risk-Adjusted Returns',
    'Risk Management'
  ];
  const metrics_values = [
    metrics.profitFactor,
    metrics.sharpeRatio,
    metrics.maxDrawdown
  ];

  // Generate radar chart points
  const getRadarPoint = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / metrics_labels.length - Math.PI / 2;
    const distance = (value / 100) * radius;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    return { x, y };
  };

  // Generate radar chart path
  const radarPath =
    metrics_values
      .map((value, index) => {
        const point = getRadarPoint(index, value);
        return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
      })
      .join(' ') + ' Z';

  // Generate grid lines
  const gridLines = [20, 40, 60, 80, 100].map((level) => {
    const points = metrics_labels
      .map((_, index) => {
        const angle =
          (index * 2 * Math.PI) / metrics_labels.length - Math.PI / 2;
        const distance = (level / 100) * radius;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        return `${x},${y}`;
      })
      .join(' ');
    return `M ${points} Z`;
  });

  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white">PrimeScope Score</h3>
          <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">i</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full ${scoreGrade.bgColor}`}>
          <span className={`text-sm font-bold ${scoreGrade.color}`}>
            {scoreGrade.grade}
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center mb-6">
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <g fill="none" stroke="#374151" strokeWidth="1" opacity="0.3">
            {gridLines.map((path, index) => (
              <path key={index} d={path} />
            ))}
          </g>

          {/* Axis lines */}
          {metrics_labels.map((_, index) => {
            const angle =
              (index * 2 * Math.PI) / metrics_labels.length - Math.PI / 2;
            const x2 = centerX + Math.cos(angle) * radius;
            const y2 = centerY + Math.sin(angle) * radius;
            return (
              <line
                key={index}
                x1={centerX}
                y1={centerY}
                x2={x2}
                y2={y2}
                stroke="#374151"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}

          {/* Data area */}
          <path
            d={radarPath}
            fill="url(#radarGradient)"
            stroke="#8b5cf6"
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Data points */}
          {metrics_values.map((value, index) => {
            const point = getRadarPoint(index, value);
            return (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}

          {/* Labels */}
          {metrics_labels.map((label, index) => {
            const angle =
              (index * 2 * Math.PI) / metrics_labels.length - Math.PI / 2;
            const labelRadius = radius + 20;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;
            return (
              <text
                key={index}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-slate-300 font-medium"
              >
                {label}
              </text>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Overall Score */}
      <div className="text-center mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-2">
          YOUR PRIMESCOPE SCORE
        </h4>
        <div className="text-4xl font-bold text-white mb-4">
          {metrics.overallScore}
        </div>

        {/* Score bar */}
        <div className="relative mb-2">
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
          <div
            className="absolute top-0 w-3 h-3 bg-white rounded-full border-2 border-slate-800 transform -translate-x-1/2"
            style={{ left: `${metrics.overallScore}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">
          Core Metrics
        </h4>

        {/* Profit Factor */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">
              Profit Factor
            </span>
            <span className="text-lg font-bold text-white">
              {metrics.profitFactor.toFixed(0)}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.profitFactor}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Measures profitability efficiency
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">
              Risk-Adjusted Returns
            </span>
            <span className="text-lg font-bold text-white">
              {metrics.sharpeRatio.toFixed(0)}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.sharpeRatio}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Returns per unit of risk taken
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">
              Risk Management
            </span>
            <span className="text-lg font-bold text-white">
              {metrics.maxDrawdown.toFixed(0)}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.maxDrawdown}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Drawdown control and risk management
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="mt-6 p-4 bg-slate-700/20 rounded-lg">
        <h5 className="text-sm font-semibold text-slate-300 mb-2">
          Performance Insights
        </h5>
        <div className="text-xs text-slate-400 space-y-1">
          {metrics.overallScore >= 80 && (
            <p>• Excellent trading performance with strong risk management</p>
          )}
          {metrics.overallScore >= 60 && metrics.overallScore < 80 && (
            <p>
              • Good performance with room for improvement in risk management
            </p>
          )}
          {metrics.overallScore >= 40 && metrics.overallScore < 60 && (
            <p>
              • Average performance - focus on improving profit factor and risk
              control
            </p>
          )}
          {metrics.overallScore < 40 && (
            <p>
              • Needs improvement - focus on risk management and consistency
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
