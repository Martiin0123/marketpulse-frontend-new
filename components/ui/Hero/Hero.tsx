'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowRight,
  Shield,
  CheckCircle,
  Star,
  Zap,
  Target,
  BarChart3,
  DollarSign,
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
    <section className="relative min-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Subtle Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),_rgba(0,0,0,0))]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Transform Your Trading with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                {' '}
                <br />
                AI-Powered Signals
              </span>
            </h1>
            {/* Value Props */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-lg text-slate-300">
                  <strong>Proven Track Record:</strong> Real-time performance
                  tracking with advanced analytics
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-lg text-slate-300">
                  <strong>No-Loss Guarantee:</strong> Full refund for any
                  net-negative month
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-lg text-slate-300">
                  <strong>Instant Access:</strong> Start receiving signals
                  within 2 minutes
                </p>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-xl border border-emerald-500/30 mb-8">
              <Shield className="w-5 h-5 text-emerald-500 mr-3" />
              <span className="text-emerald-200 font-medium">
                💰 Monthly No Loss Guarantee - Your Success or Your Money Back
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Link href="/dashboard">
                  <Button
                    variant="slim"
                    className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 text-lg font-semibold"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Start free now - Upgrade later
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button
                      variant="slim"
                      className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 text-lg font-semibold"
                    >
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
                    <Button
                      variant="slim"
                      className="group bg-transparent border-2 border-blue-500 hover:border-blue-400 text-blue-400 hover:text-white px-8 py-4 text-lg font-semibold"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      Join Free Discord
                    </Button>
                  </a>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>No Setup Fees</span>
              </div>
              <div className="flex items-center space-x-2">
                <ArrowRight className="w-4 h-4 text-emerald-500" />
                <span>Cancel Anytime</span>
              </div>
            </div>

            {/* Social Proof */}
            <div className="mt-6 flex items-center justify-center lg:justify-start space-x-4">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  J
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  M
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  S
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
              </div>
              <div className="text-sm text-slate-400">
                <span className="text-emerald-400 font-semibold">
                  500+ traders
                </span>{' '}
                already profiting
              </div>
            </div>
          </div>

          {/* Right Column - Performance Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      This Month's Performance
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Bybit Trading Results
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-3xl font-bold ${pnlColor} flex items-center justify-end`}
                  >
                    {monthlyPnL?.totalPnL && monthlyPnL.totalPnL > 0 ? (
                      <TrendingUp className="w-6 h-6 mr-2" />
                    ) : (
                      <TrendingDown className="w-6 h-6 mr-2" />
                    )}
                    {formattedPnL}
                  </div>
                  <div className="text-slate-400 text-sm">Total Return</div>
                </div>
              </div>

              {/* Performance Stats Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm rounded-2xl border border-emerald-500/30 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        {winRate}%
                      </div>
                      <div className="text-xs text-emerald-300">Win Rate</div>
                    </div>
                  </div>
                  <div className="text-sm text-emerald-200">
                    {monthlyPnL?.profitablePositions || 0} of{' '}
                    {monthlyPnL?.totalPositions || 0} trades profitable
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">
                        {monthlyPnL?.totalPositions || 0}
                      </div>
                      <div className="text-xs text-blue-300">Total Signals</div>
                    </div>
                  </div>
                  <div className="text-sm text-blue-200">
                    This month's trading activity
                  </div>
                </div>
              </div>

              {/* Performance Highlights */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        Best Trade
                      </div>
                      <div className="text-xs text-slate-400">
                        Highest single trade return
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      +15.2%
                    </div>
                    <div className="text-xs text-slate-400">SOLUSDT</div>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="mt-6 pt-6 border-t border-slate-700/50">
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-2">
                    Ready to start trading?
                  </div>
                  <Link href="/pricing">
                    <Button
                      variant="slim"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Start Trading Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
