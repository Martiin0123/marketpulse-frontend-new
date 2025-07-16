import Hero from '@/components/ui/Hero/Hero';
import Testimonials from '@/components/ui/Testimonials/Testimonials';
import CTA from '@/components/ui/CTA/CTA';
import Stats from '@/components/ui/Stats/Stats';
import HowItWorks from '@/components/ui/HowItWorks/HowItWorks';
import FAQ from '@/components/ui/FAQ/FAQ';
import Features from '@/components/ui/Features/Features';
import PricingPlans from '@/components/ui/PricingPlans/PricingPlans';
import { createClient } from '@/utils/supabase/server';
import { calculateTradingStats } from '@/utils/stats';
import { getUser, getProducts, getSubscription } from '@/utils/supabase/queries';
import { Metadata } from 'next';
import { Zap, Target, X, CheckCircle, ArrowRight } from 'lucide-react';
import LoadingLink from '@/components/ui/Loading/LoadingLink';
import Button from '@/components/ui/Button';
import ChatWidget from '@/components/ui/ChatWidget/ChatWidget';

// SEO Metadata
export const metadata: Metadata = {
  title:
    'PrimeScope - AI-Powered Trading Signals | Early Access for Serious Traders',
  description:
    'Join our growing community of traders using AI-powered signals. Get real-time alerts, risk-free monthly guarantee, and earn rewards through our referral program. Limited early access available.',
  keywords:
    'trading signals, AI trading, crypto signals, trading alerts, automated trading, trading bot, market analysis, trading strategy, referral program, early access',
  openGraph: {
    title:
      'PrimeScope - AI-Powered Trading Signals | Early Access for Serious Traders',
    description:
      'Join our growing community of traders using AI-powered signals. Get real-time alerts, risk-free monthly guarantee, and earn rewards through our referral program.',
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
      'Join our growing community of traders using AI-powered signals. Limited early access available.',
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

  // Get user session and data
  const [user, products, subscription] = await Promise.all([
    getUser(supabase),
    getProducts(supabase),
    getSubscription(supabase)
  ]);

  const productsData = products || [];

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
      {/* Limited Time Offer Banner
      <div className="w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-500 text-white text-center py-2 font-semibold tracking-wide shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        <div className="relative z-10">
          Limited Time Offer:{' '}
          <span className="font-bold">Get 20% Off Your First Month!</span> Use
          code <span className="bg-white/20 px-2 py-1 rounded">EARLY20</span>
        </div>
      </div>
       */}

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

        {/* Pricing Section */}
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-6">
              <span className="text-emerald-200 text-sm font-medium">
                ⚡ Limited Time Offer
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Start Making Money
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
                {' '}
                Today
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-4">
              Choose your plan and start receiving profitable trading signals within minutes. No setup required.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-orange-500/10 backdrop-blur-sm rounded-full border border-orange-500/30">
              <span className="text-orange-200 text-sm font-medium">
                🎯 Start receiving profitable signals within minutes
              </span>
            </div>
          </div>
          
          <PricingPlans
            products={productsData}
            user={user}
            subscription={subscription}
            showTimer={true}
            showHeader={false}
            showGuarantee={true}
          />
        </section>

        {/* Referral Program Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-6">
              <span className="text-emerald-200 text-sm font-medium">
                💰 Passive Income Opportunity
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Earn €19 for Every
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
                {' '}
                Trader You Refer
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Turn your network into a revenue stream. Get paid monthly for successful referrals with unlimited earning potential.
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* How It Works */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">
                  How It Works
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                      1
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        Get Your Referral Link
                      </h4>
                      <p className="text-slate-400">
                        Access your unique referral link from your dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                      2
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        Share with Traders
                      </h4>
                      <p className="text-slate-400">
                        Share your link with other traders who might be
                        interested
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1">
                      3
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        Earn Rewards
                      </h4>
                      <p className="text-slate-400">
                        Get paid when your referrals subscribe to premium plans
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rewards */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Rewards</h3>
                <div className="space-y-4">
                  <div className="bg-slate-700/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">
                        Any Referral
                      </span>
                      <span className="text-emerald-400 font-bold">€19</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      When someone subscribes to any premium plan
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">
                        Monthly Payouts
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Get paid monthly for all your referrals
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8">
              {user ? (
                <LoadingLink href="/referrals">
                  <Button variant="primary" size="lg" className="group">
                    View My Referrals
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </LoadingLink>
              ) : (
                <LoadingLink href="/signin">
                  <Button variant="primary" size="lg" className="group">
                    Start Earning Rewards
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </LoadingLink>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
              <span className="text-blue-200 text-sm font-medium">
                🏆 Why We're Different
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              The Only Trading Service with a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                Money-Back Guarantee
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              We're so confident in our signals that we guarantee your money back if we don't perform. Can your current provider do that?
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

        {/* Urgency Section */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 my-20">
          <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-orange-500/10 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
              <span className="text-orange-200 text-sm font-medium">
                ⏰ Time-Sensitive Opportunity
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Don't Wait - Markets Never Stop Moving
            </h2>
            <p className="text-lg text-slate-300 mb-6">
              Every day you delay is potential profit lost. Markets never stop moving, and neither should your trading strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center text-emerald-400">
                <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">Real-time market analysis</span>
              </div>
              <div className="flex items-center text-blue-400">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">Instant signal delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <CTA user={user} />

        {/* Footer */}
        {/* Assuming Footer component exists and is imported */}
        {/* <Footer /> */}

        {/* AI Chat Widget */}
        <ChatWidget />
      </div>
    </>
  );
}
