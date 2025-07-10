import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Target,
  Users,
  Award,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default async function PerformanceGuarantee() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="pt-20 pb-12 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-500/20 rounded-full">
                <Shield className="w-12 h-12 text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              No Loss Guarantee
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              We stand behind our trading signals with a comprehensive
              performance guarantee
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Guarantee Overview */}
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-8 mb-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Monthly Performance Guarantee
            </h2>
            <p className="text-lg text-slate-300 mb-6">
              If any month shows negative performance, we'll provide a full
              refund for that month - no questions asked.
            </p>
            <div className="flex items-center justify-center space-x-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                Monthly performance guarantee
              </span>
            </div>
          </div>
        </div>

        {/* Guarantee Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* What's Covered */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mr-3" />
              What's Covered
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-slate-200 font-medium">Monthly Refund</h4>
                  <p className="text-slate-400 text-sm">
                    Full refund for any month with negative performance
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-slate-200 font-medium">
                    No Questions Asked
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Simple, straightforward refund process
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Monthly Evaluation
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Performance calculated on a monthly basis
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Quick Processing
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Refunds processed within 3-5 business days
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Clock className="w-6 h-6 text-blue-400 mr-3" />
              How It Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Subscribe to PrimeScope
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Choose your plan and start receiving signals
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Track Monthly Performance
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Monitor your trading results each month
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Request Refund if Negative
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Contact support if month shows negative performance
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium">
                    Get Your Money Back
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Full refund for the negative month
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Standards */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-semibold text-white mb-8 text-center">
            Our Performance Standards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-full">
                  <Target className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                75%+ Win Rate
              </h4>
              <p className="text-slate-400 text-sm">
                Consistent profitable trading signals
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                10%+ Monthly Returns
              </h4>
              <p className="text-slate-400 text-sm">
                Strong average monthly performance
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-cyan-500/20 rounded-full">
                  <Users className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                24/7 Support
              </h4>
              <p className="text-slate-400 text-sm">
                Expert assistance when you need it
              </p>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
            Terms and Conditions
          </h3>
          <div className="space-y-3 text-slate-400 text-sm">
            <p>
              • The monthly performance guarantee applies to all active
              subscriptions.
            </p>
            <p>
              • Refund requests must be submitted within 7 days of the end of
              the negative month.
            </p>
            <p>
              • Refunds are processed within 3-5 business days to your original
              payment method.
            </p>
            <p>
              • This guarantee does not cover losses from trading decisions or
              market volatility beyond our signals.
            </p>
            <p>
              • Performance is calculated based on the signals provided during
              the month.
            </p>
            <p>
              • We reserve the right to modify these terms with 30 days notice.
            </p>
            <p>
              • For questions about our guarantee, contact our support team.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Start Trading with Confidence?
            </h3>
            <p className="text-slate-200 mb-6">
              Join thousands of traders who trust PrimeScope for their trading
              decisions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signin/signup">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
