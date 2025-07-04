'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Shield, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import BalanceChart from '@/components/ui/Charts/BalanceChart';
import { Tables } from '@/types_db';

interface HeroProps {
  user: User | null | undefined;
  monthlyPnL?: {
    totalPnL: number;
    profitablePositions: number;
    totalPositions: number;
    monthlyData: { timestamp: number; value: number }[];
  };
  positions?: Tables<'positions'>[];
}

export default function Hero({ user, monthlyPnL, positions }: HeroProps) {
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
      ? 'text-emerald-500'
      : 'text-red-400';

  return (
    <section className="relative min-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Subtle Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),_rgba(0,0,0,0))]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              AI-Powered
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                {' '}
                Trading
              </span>
              <br />
              Made Simple
            </h1>

            {/* Value Props */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                <p className="text-xl text-slate-300">
                  Real-time signals with {winRate}% win rate
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                <p className="text-xl text-slate-300">
                  Advanced AI analysis & risk management
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                <p className="text-xl text-slate-300">
                  24/7 market monitoring & alerts
                </p>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-xl border border-emerald-500/30 mb-8">
              <Shield className="w-5 h-5 text-emerald-500 mr-3" />
              <span className="text-emerald-200 font-medium">
                30-Day Money-Back Guarantee
              </span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="slim" className="group">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <Link href="/pricing">
                  <Button variant="slim" className="group">
                    Start Trading Now
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Column - Chart */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    This Month's Performance
                  </h3>
                  <p className="text-slate-400">Real-time trading results</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${pnlColor}`}>
                    {formattedPnL}
                  </div>
                  <div className="text-slate-400">Win Rate: {winRate}%</div>
                </div>
              </div>
              <div className="h-48">
                <BalanceChart
                  positions={positions || []}
                  accountSize={10000}
                  showContainer={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
