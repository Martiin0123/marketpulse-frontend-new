'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { TrendingUp, BarChart3, Zap, ArrowRight, Play } from 'lucide-react';
import Button from '@/components/ui/Button';

interface HeroProps {
  user: User | null | undefined;
}

export default function Hero({ user }: HeroProps) {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-8">
              <TrendingUp className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-purple-200 text-sm font-medium">
                #1 AI-Powered Trading Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Master the
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {' '}
                Markets
              </span>
              <br />
              with AI Precision
            </h1>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Get real-time trading signals, advanced technical analysis, and
              market insights powered by cutting-edge AI. Join thousands of
              successful traders.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
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
                <>
                  <Link href="/pricing">
                    <Button
                      variant="slim"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                    >
                      Start Trading Smarter
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <button className="flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-all duration-300 group">
                    <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </button>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-8 text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">50,000+ Active Traders</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span className="text-sm">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">Real-time Signals</span>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            {/* Trading Dashboard Preview */}
            <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-400">
                  MarketPulse Dashboard
                </div>
              </div>

              {/* Mock Trading Interface */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                    <div className="text-green-400 text-sm font-medium mb-1">
                      BUY Signal
                    </div>
                    <div className="text-white text-lg font-bold">AAPL</div>
                    <div className="text-green-400 text-sm">+2.4% (Strong)</div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                    <div className="text-red-400 text-sm font-medium mb-1">
                      SELL Signal
                    </div>
                    <div className="text-white text-lg font-bold">TSLA</div>
                    <div className="text-red-400 text-sm">-1.8% (Moderate)</div>
                  </div>
                </div>

                {/* Chart placeholder */}
                <div className="bg-gray-700/50 rounded-lg p-4 h-32 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                  <span className="ml-2 text-gray-400">Live Market Chart</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-white text-lg font-bold">94.2%</div>
                    <div className="text-gray-400 text-xs">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-green-400 text-lg font-bold">
                      +$12.5K
                    </div>
                    <div className="text-gray-400 text-xs">This Month</div>
                  </div>
                  <div>
                    <div className="text-purple-400 text-lg font-bold">156</div>
                    <div className="text-gray-400 text-xs">Signals</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg p-3 shadow-lg animate-bounce">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg p-3 shadow-lg animate-pulse">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
