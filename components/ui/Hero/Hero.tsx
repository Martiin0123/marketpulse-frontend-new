'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  Star,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Button from '@/components/ui/Button';
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
    <section className="relative min-h-[80vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Subtle Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),_rgba(0,0,0,0))]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              AI-Powered Trading Signals
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                {' '}
                That Actually Work
              </span>
            </h1>

            {/* Simple Subtitle */}
            <p className="text-xl text-slate-300 mb-8">
              Join 500+ traders using our proven AI algorithms. No loss
              guarantee included.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="primary" size="lg" className="group">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button variant="primary" size="lg" className="group">
                      <Target className="w-5 h-5 mr-2" />
                      Start Trading Now
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <a
                    href="https://discord.gg/N7taGVuz"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="group">
                      <Star className="w-5 h-5 mr-2" />
                      Join Free Discord
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Minimalistic Performance Card */}
          <div className="relative">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-6">
                  This Month's Performance
                </h3>

                {/* Main P&L Display */}
                <div className="mb-8">
                  <div
                    className={`text-4xl font-bold ${pnlColor} flex items-center justify-center mb-2`}
                  >
                    {monthlyPnL?.totalPnL && monthlyPnL.totalPnL > 0 ? (
                      <TrendingUp className="w-8 h-8 mr-3" />
                    ) : (
                      <TrendingDown className="w-8 h-8 mr-3" />
                    )}
                    {formattedPnL}
                  </div>
                  <div className="text-slate-400">Total Return</div>
                </div>

                {/* Simple Stats */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {winRate}%
                    </div>
                    <div className="text-sm text-slate-400">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {monthlyPnL?.totalPositions || 0}
                    </div>
                    <div className="text-sm text-slate-400">Signals</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
