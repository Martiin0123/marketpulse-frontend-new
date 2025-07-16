'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/auth-context';
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Gift,
  Star,
  Activity,
  BarChart3,
  Target,
  DollarSign
} from 'lucide-react';

export default function ThankYouPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Get session_id from URL params (Stripe sends this)
  const sessionId = searchParams?.get('session_id');
  const subscriptionType = searchParams?.get('subscription_type') || 'Premium';

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewPricing = () => {
    router.push('/pricing');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.1),_rgba(0,0,0,0))]"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full border border-emerald-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Welcome to PrimeScope!
          </h1>

          <p className="text-xl text-slate-300 mb-6">
            Your {subscriptionType} subscription has been activated
            successfully.
          </p>

          {sessionId && (
            <div className="inline-flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700">
              <span className="text-sm text-slate-400">
                Session ID: {sessionId.slice(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {/* What's Next Section */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Sparkles className="w-6 h-6 text-emerald-400 mr-3" />
            What's Next?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Access Your Dashboard
                  </h3>
                  <p className="text-slate-400 text-sm">
                    View real-time trading signals, performance metrics, and
                    manage your account.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Start Trading
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Follow our AI-powered signals and start building your
                    portfolio.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Track Performance
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Monitor your trading performance and analyze your results.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Join Community
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Connect with other traders in our Discord community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Real-time Signals
            </h3>
            <p className="text-slate-400 text-sm">Get instant trading alerts</p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              High Accuracy
            </h3>
            <p className="text-slate-400 text-sm">AI-powered analysis</p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Loss Guarantee
            </h3>
            <p className="text-slate-400 text-sm">Risk-free trading</p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Premium Support
            </h3>
            <p className="text-slate-400 text-sm">24/7 assistance</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoToDashboard}
            className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Activity className="w-5 h-5 mr-2" />
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>

          <button
            onClick={handleViewPricing}
            className="flex items-center justify-center px-8 py-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-white font-semibold rounded-xl hover:bg-slate-700/50 transition-all duration-300"
          >
            <Gift className="w-5 h-5 mr-2" />
            View Plans
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-400 mr-3" />
            <span className="text-emerald-200 text-sm font-medium">
              Your subscription is now active
            </span>
          </div>

          <p className="text-slate-400 text-sm mt-4 max-w-2xl mx-auto">
            You'll receive a confirmation email shortly. If you have any
            questions, please don't hesitate to contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
