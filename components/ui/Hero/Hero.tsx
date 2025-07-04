'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Shield, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import Chart to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <div className="text-gray-400">Loading chart...</div>
    </div>
  )
});

interface HeroProps {
  user: User | null | undefined;
  monthlyPnL?: {
    totalPnL: number;
    profitablePositions: number;
    totalPositions: number;
  };
}

export default function Hero({ user, monthlyPnL }: HeroProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate win rate
  const winRate = monthlyPnL?.totalPositions
    ? (
        (monthlyPnL.profitablePositions / monthlyPnL.totalPositions) *
        100
      ).toFixed(1)
    : '0.0';

  // Format PnL with + or - and 2 decimal places
  const formattedPnL = monthlyPnL?.totalPnL
    ? `${monthlyPnL.totalPnL > 0 ? '+' : ''}${monthlyPnL.totalPnL.toFixed(2)}%`
    : '+0.00%';

  // Determine PnL color
  const pnlColor =
    monthlyPnL?.totalPnL && monthlyPnL.totalPnL > 0
      ? 'text-green-400'
      : 'text-red-400';

  // Chart configuration
  const chartOptions = {
    chart: {
      type: 'area' as const,
      toolbar: { show: false },
      sparkline: { enabled: true },
      background: 'transparent',
      fontFamily: 'Inter, sans-serif'
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.2,
        opacityTo: 0.0,
        stops: [0, 100]
      }
    },
    tooltip: { enabled: false },
    grid: { show: false },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { show: false },
      min: monthlyPnL?.totalPnL ? Math.min(0, monthlyPnL.totalPnL * 0.8) : 0,
      max: monthlyPnL?.totalPnL ? Math.max(0, monthlyPnL.totalPnL * 1.2) : 100
    },
    colors: [
      monthlyPnL?.totalPnL && monthlyPnL.totalPnL > 0 ? '#10B981' : '#EF4444'
    ]
  };

  const series = [
    {
      name: 'Performance',
      data: monthlyPnL?.totalPnL
        ? [
            0,
            monthlyPnL.totalPnL * 0.3,
            monthlyPnL.totalPnL * 0.7,
            monthlyPnL.totalPnL
          ]
        : [0]
    }
  ];

  return (
    <section className="relative min-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Subtle Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(168,85,247,0.1),_rgba(0,0,0,0))]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Performance Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full mb-8">
              <TrendingUp className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-purple-200 text-sm font-medium">
                Monthly Performance:{' '}
                <span className={pnlColor}>{formattedPnL}</span>
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              AI-Powered
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {' '}
                Trading
              </span>
              <br />
              Made Simple
            </h1>

            {/* Value Props */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <p className="text-xl text-gray-300">
                  Real-time signals with {winRate}% win rate
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <p className="text-xl text-gray-300">
                  Advanced AI analysis & risk management
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <p className="text-xl text-gray-300">
                  24/7 market monitoring & alerts
                </p>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/30 mb-8">
              <Shield className="w-5 h-5 text-green-400 mr-3" />
              <span className="text-green-200 font-medium">
                30-Day Money-Back Guarantee
              </span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link href="/dashboard">
                  <Button
                    variant="slim"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <Link href="/pricing">
                  <Button
                    variant="slim"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Start Trading Now
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Column - Chart */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl"></div>
            <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700/50 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Monthly Performance
                  </h3>
                  <p className="text-gray-400">Real-time trading results</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${pnlColor}`}>
                    {formattedPnL}
                  </div>
                  <div className="text-gray-400">Win Rate: {winRate}%</div>
                </div>
              </div>
              {isMounted && (
                <Chart
                  options={chartOptions}
                  series={series}
                  type="area"
                  height={200}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
