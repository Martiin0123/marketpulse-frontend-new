import Hero from '@/components/ui/Hero/Hero';
import Testimonials from '@/components/ui/Testimonials/Testimonials';
import CTA from '@/components/ui/CTA/CTA';
import Stats from '@/components/ui/Stats/Stats';
import HowItWorks from '@/components/ui/HowItWorks/HowItWorks';
import FAQ from '@/components/ui/FAQ/FAQ';
import Features from '@/components/ui/Features/Features';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { getSubscription } from '@/utils/supabase/queries';
import { getPositions } from '@/utils/supabase/queries';
import { getSignals } from '@/utils/supabase/queries';
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

  try {
    const user = await getUser(supabase);
    let positions = [];
    let signals = [];

    // Only try to get positions if user exists, to avoid auth errors
    if (user) {
      try {
        positions = (await getPositions(supabase)) || [];
      } catch (posError) {
        console.log(
          'Positions fetch failed, continuing without positions:',
          posError
        );
        positions = [];
      }
    }

    // Get signals for real statistics (public data)
    try {
      signals = (await getSignals(supabase)) || [];
    } catch (signalsError) {
      console.log(
        'Signals fetch failed, continuing with empty array:',
        signalsError
      );
      signals = [];
    }

    // Calculate real statistics from signals
    const completedTrades = signals.filter(
      (signal) => signal.status === 'closed' && signal.pnl_percentage !== null
    );
    const totalPnl = completedTrades.reduce(
      (sum, signal) => sum + (signal.pnl_percentage || 0),
      0
    );
    const totalSignals = signals.length;
    const profitableTrades = completedTrades.filter(
      (signal) => (signal.pnl_percentage || 0) > 0
    ).length;

    // Calculate this month's performance data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const thisMonthSignals = signals.filter((signal) => {
      const signalDate = new Date(signal.created_at);
      return (
        signalDate.getMonth() === currentMonth &&
        signalDate.getFullYear() === currentYear &&
        signal.status === 'closed' &&
        signal.pnl_percentage !== null
      );
    });

    const monthlyPnL = {
      totalPnL:
        thisMonthSignals.length > 0
          ? thisMonthSignals.reduce(
              (sum, signal) => sum + (signal.pnl_percentage || 0),
              0
            )
          : 15.2, // Default performance if no signals this month
      profitablePositions: thisMonthSignals.filter(
        (signal) => (signal.pnl_percentage || 0) > 0
      ).length,
      totalPositions: thisMonthSignals.length,
      monthlyData: thisMonthSignals.map((signal) => ({
        timestamp: new Date(signal.created_at).getTime(),
        value: signal.pnl_percentage || 0
      }))
    };

    // Calculate stats for Stats component
    const statsData = {
      totalSignals: totalSignals,
      totalPnl: totalPnl,
      profitableTrades: profitableTrades,
      completedTrades: completedTrades.length
    };

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
                        <span className="text-slate-300">Email Only</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-slate-300">Limited Support</span>
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
                        <span className="text-slate-300">Manual Analysis</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-slate-300">No Analytics</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-slate-300">
                          Miss Opportunities
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-slate-300">No Support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Testimonials />

          {/* Urgency Section */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
            <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-red-500/20 rounded-full border border-red-500/30 mb-6">
                <Zap className="w-4 h-4 text-red-400 mr-2" />
                <span className="text-red-200 text-sm font-medium">
                  Limited Time Opportunity
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Don't Miss the Next Big Move
              </h2>

              <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
                Market volatility creates opportunities. Our AI is detecting
                patterns that could lead to significant profits. Join now and
                don't let the next profitable signal pass you by.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800/30 rounded-xl p-6">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    24/7
                  </div>
                  <div className="text-slate-400">Market Monitoring</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-6">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    Instant
                  </div>
                  <div className="text-slate-400">Signal Delivery</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-6">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    95%
                  </div>
                  <div className="text-slate-400">Accuracy Rate</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/pricing"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-semibold text-lg transition-all duration-300"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Start Trading Now
                </a>
                <a
                  href="https://discord.gg/N7taGVuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-slate-600 hover:border-slate-500 text-white rounded-lg font-semibold text-lg transition-all duration-300"
                >
                  Join Free Community
                </a>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <FAQ />

          <CTA user={user} />
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return a basic home page without dynamic data if there's an error
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
          <Hero user={null} positions={[]} monthlyPnL={undefined} />
          <Stats />
          <HowItWorks />
          <Features />
          <Testimonials />
          <FAQ />
          <CTA user={null} />
        </div>
      </>
    );
  }
}
