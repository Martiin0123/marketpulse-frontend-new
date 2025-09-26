'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PrimeScopeScoreProps {
  accountId: string | null; // null for combined view
  className?: string;
}

interface ScoreMetrics {
  profitFactor: number;
  risk: number;
  discipline: number;
  resilience: number;
  win: number;
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
            risk: 0,
            discipline: 0,
            resilience: 0,
            win: 0,
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
        const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

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

        // Calculate streaks
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;

        for (const pnl of pnlValues) {
          if (pnl > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          } else if (pnl < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
          }
        }

        // Calculate drawdown
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

        // Calculate PrimeScope Score metrics (0-100 scale)
        const profitFactorScore = Math.min((profitFactor - 1) * 25, 100); // 1.0 = 0, 5.0 = 100
        const riskScore = Math.max(
          0,
          100 - (maxDrawdown / Math.abs(peak || 1)) * 100
        ); // Lower drawdown = higher score
        const disciplineScore = Math.min(winRate * 1.2, 100); // Win rate with slight boost
        const resilienceScore = Math.max(0, 100 - maxLossStreak * 10); // Lower loss streaks = higher score
        const winScore = Math.min(
          (averageWin / Math.max(averageLoss, 1)) * 30,
          100
        ); // Win/Loss ratio

        // Calculate overall score
        const overallScore = Math.round(
          profitFactorScore * 0.25 +
            riskScore * 0.25 +
            disciplineScore * 0.2 +
            resilienceScore * 0.15 +
            winScore * 0.15
        );

        setMetrics({
          profitFactor: Math.max(0, Math.min(100, profitFactorScore)),
          risk: Math.max(0, Math.min(100, riskScore)),
          discipline: Math.max(0, Math.min(100, disciplineScore)),
          resilience: Math.max(0, Math.min(100, resilienceScore)),
          win: Math.max(0, Math.min(100, winScore)),
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

  // Radar chart configuration
  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  const metrics_labels = [
    'Profit Factor',
    'Risk',
    'Discipline',
    'Resilience',
    'Win'
  ];
  const metrics_values = [
    metrics.profitFactor,
    metrics.risk,
    metrics.discipline,
    metrics.resilience,
    metrics.win
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
      <div className="text-center">
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

      {/* Score breakdown */}
      <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Profit Factor</span>
          <span className="text-white font-medium">
            {metrics.profitFactor.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Risk</span>
          <span className="text-white font-medium">
            {metrics.risk.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Discipline</span>
          <span className="text-white font-medium">
            {metrics.discipline.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Resilience</span>
          <span className="text-white font-medium">
            {metrics.resilience.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-slate-400">Win Ratio</span>
          <span className="text-white font-medium">
            {metrics.win.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}
