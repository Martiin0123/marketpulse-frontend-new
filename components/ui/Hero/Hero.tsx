'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Award
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
                for Serious Traders
              </span>
            </h1>

            {/* Simple Subtitle */}
            <p className="text-xl text-slate-300 mb-8">
              Join our growing community of traders using AI algorithms. No loss
              guarantee + earn rewards through our referral program.
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
                    href="https://discord.gg/GDY4ZcXzes"
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

          {/* Right Column - Professional Performance Card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-4">
                  <BarChart3 className="w-4 h-4 text-emerald-500 mr-2" />
                  <span className="text-emerald-200 text-sm font-medium">
                    Live Performance
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  This Month's Performance
                </h3>
              </div>

              {/* Main P&L Display */}
              <div className="mb-8">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    {monthlyPnL?.totalPnL && monthlyPnL.totalPnL > 0 ? (
                      <TrendingUp className="w-8 h-8 text-emerald-500 mr-3" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-red-500 mr-3" />
                    )}
                    <div
                      className={`text-5xl font-bold ${pnlColor} tracking-tight`}
                    >
                      {formattedPnL}
                    </div>
                  </div>
                  <div className="text-slate-400 text-lg font-medium">
                    Total Return
                  </div>
                </div>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-emerald-400 mr-2" />
                    <div className="text-2xl font-bold text-emerald-400">
                      {winRate}%
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 font-medium">
                    Win Rate
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-blue-400 mr-2" />
                    <div className="text-2xl font-bold text-blue-400">
                      {monthlyPnL?.totalPositions || 0}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 font-medium">
                    Signals
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-slate-700/20 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Profitable Trades</span>
                  <span className="text-emerald-400 font-semibold">
                    {monthlyPnL?.profitablePositions || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-400">Total Trades</span>
                  <span className="text-white font-semibold">
                    {monthlyPnL?.totalPositions || 0}
                  </span>
                </div>
              </div>

              {/* Trust Indicator */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/30">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-blue-200 text-xs font-medium">
                    Real-time Data
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
