import Hero from '@/components/ui/Hero/Hero';
import Testimonials from '@/components/ui/Testimonials/Testimonials';
import CTA from '@/components/ui/CTA/CTA';
import Stats from '@/components/ui/Stats/Stats';
import HowItWorks from '@/components/ui/HowItWorks/HowItWorks';
import FAQ from '@/components/ui/FAQ/FAQ';
import Features from '@/components/ui/Features/Features';
import { createClient } from '@/utils/supabase/server';
import { calculateTradingStats } from '@/utils/stats';
import { getUser } from '@/utils/supabase/queries';
import { getSubscription } from '@/utils/supabase/queries';
import { getPositions } from '@/utils/supabase/queries';
import { Metadata } from 'next';
import { Zap, Target, X, CheckCircle } from 'lucide-react';

// SEO Metadata
export const metadata: Metadata = {
  title:
    'PrimeScope - AI-Powered Trading Signals | Transform Your Trading Results',
  description:
    'Join 500+ successful traders using our AI-powered trading signals. Get real-time alerts with proven win rates, risk-free monthly guarantee, and instant access. Start profiting from the markets today.',
  keywords:
    'trading signals, AI trading, stock signals, forex signals, crypto signals, trading alerts, automated trading, trading bot, market analysis, trading strategy',
  openGraph: {
    title:
      'PrimeScope - AI-Powered Trading Signals | Transform Your Trading Results',
    description:
      'Join 500+ successful traders using our AI-powered trading signals. Get real-time alerts with proven win rates and risk-free monthly guarantee.',
    type: 'website',
    url: 'https://primescope.com',
    siteName: 'PrimeScope',
    images: [
      {
        url: '/demo.png',
        width: 1200,
        height: 630,
        alt: 'PrimeScope AI Trading Signals Dashboard'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrimeScope - AI-Powered Trading Signals',
    description:
      'Transform your trading with AI-powered signals. Join 500+ successful traders today.',
    images: ['/demo.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://primescope.com'
  }
};

export default async function HomePage() {
  const supabase = createClient();

  // Get user session
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Get user's positions if logged in
  let positions: any[] = [];
  if (user) {
    const { data: positionsData } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    positions = positionsData || [];
  }

  // Calculate trading stats directly
  let tradingStats = null;
  try {
    console.log('🔍 Home: Calculating trading stats directly');
    tradingStats = await calculateTradingStats();
    console.log('✅ Home: Stats calculation successful:', {
      totalSignals: tradingStats.totalSignals,
      totalPnl: tradingStats.totalPnl,
      profitableTrades: tradingStats.profitableTrades,
      completedTrades: tradingStats.closedSignals,
      thisMonthPnl: tradingStats.thisMonthPnl
    });
  } catch (error) {
    console.error('❌ Home: Stats calculation failed:', error);
  }

  // Use centralized stats or fallback data
  const stats = tradingStats || {
    totalSignals: 0,
    totalPnl: 0,
    profitableTrades: 0,
    closedSignals: 0,
    thisMonthPnl: 0,
    thisMonthSignals: 0,
    thisMonthProfitable: 0,
    monthlyReturns: []
  };

  console.log('🔍 Home: Processed stats object:', {
    totalSignals: stats.totalSignals,
    totalPnl: stats.totalPnl,
    profitableTrades: stats.profitableTrades,
    completedTrades: stats.closedSignals,
    thisMonthPnl: stats.thisMonthPnl
  });

  // Prepare data for Hero component
  const monthlyPnL = {
    totalPnL: stats.thisMonthPnl || stats.totalPnl, // Use this month's PnL or total PnL as fallback
    profitablePositions: stats.thisMonthProfitable || stats.profitableTrades,
    totalPositions: (stats.thisMonthSignals || stats.closedSignals) as number,
    monthlyData: (stats.monthlyReturns?.map((item: any) => ({
      timestamp: new Date(item.date + '-01').getTime(),
      value: item.return
    })) || []) as { timestamp: number; value: number }[]
  };

  console.log('🔍 Home: Hero monthlyPnL data:', {
    totalPnL: monthlyPnL.totalPnL,
    profitablePositions: monthlyPnL.profitablePositions,
    totalPositions: monthlyPnL.totalPositions
  });

  // Prepare data for Stats component
  const statsData = {
    totalSignals: stats.totalSignals,
    totalPnl: stats.totalPnl,
    profitableTrades: stats.profitableTrades,
    completedTrades: stats.closedSignals as number
  };

  console.log('🔍 Home: Stats component data:', statsData);

  return (
    <>
      {/* Limited Time Offer Banner */}
      <div className="w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-500 text-white text-center py-2 font-semibold tracking-wide shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        <div className="relative z-10">
          Limited Time Offer:{' '}
          <span className="font-bold">Get 20% Off Your First Month!</span> Use
          code <span className="bg-white/20 px-2 py-1 rounded">TRADE20</span>
        </div>
      </div>

      <div className="min-h-screen bg-slate-900 relative">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <Hero user={user} positions={positions} monthlyPnL={monthlyPnL} />

        {/* Stats Section */}
        <Stats statsData={statsData} />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Features Section */}
        <Features />

        {/* Comparison Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                PrimeScope
              </span>
              ?
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              See how we stack up against other trading signal services
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* MarketPulse Column */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    PrimeScope
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        No Loss Guarantee
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        Free Discord Community
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        Real-time Signals
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        Advanced Analytics
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        Mobile Notifications
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-white font-medium">
                        24/7 Support
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Services Column */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-slate-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Other Services
                  </div>
                </div>
                <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">No Guarantee</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">Paid Communities</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-slate-300">Delayed Signals</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">Basic Analytics</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">Limited Support</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">No Mobile App</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Traditional Trading Column */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-slate-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Traditional Trading
                  </div>
                </div>
                <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">High Risk</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">No Guidance</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">Emotional Trading</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">Time Consuming</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">No Community</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-slate-300">
                        Steep Learning Curve
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <Testimonials />

        {/* FAQ Section */}
        <FAQ />

        {/* CTA Section */}
        <CTA user={user} />

        {/* Footer */}
        {/* Assuming Footer component exists and is imported */}
        {/* <Footer /> */}
      </div>
    </>
  );
}
