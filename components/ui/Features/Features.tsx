import {
  Brain,
  Shield,
  Zap,
  Target,
  Clock,
  BarChart2,
  TrendingUp,
  Users,
  Award,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Features() {
  const features = [
    {
      icon: <Brain className="w-10 h-10 text-purple-400" />,
      title: 'Advanced AI Algorithms',
      description:
        'Our proprietary machine learning models analyze 50+ market indicators in real-time to identify high-probability trading opportunities with surgical precision.',
      stats: '95% accuracy rate'
    },
    {
      icon: <BarChart2 className="w-10 h-10 text-blue-400" />,
      title: 'Real-Time Signal Delivery',
      description:
        'Get instant notifications via email, SMS, and Discord the moment our AI detects a profitable trading opportunity. Never miss a winning trade again.',
      stats: '24/7 monitoring'
    },
    {
      icon: <Shield className="w-10 h-10 text-green-400" />,
      title: 'Risk Management System',
      description:
        'Built-in position sizing, stop-loss recommendations, and portfolio protection tools help you maximize profits while minimizing potential losses.',
      stats: 'Risk-controlled'
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-emerald-400" />,
      title: 'Performance Tracking',
      description:
        'Track your success in real-time with detailed analytics, win rates, profit/loss tracking, and comprehensive performance reports.',
      stats: 'Transparent results'
    },
    {
      icon: <Users className="w-10 h-10 text-cyan-400" />,
      title: 'Expert Community',
      description:
        'Join our exclusive Discord community of successful traders. Share insights, get support, and learn from fellow traders around the world.',
      stats: '500+ active members'
    },
    {
      icon: <Award className="w-10 h-10 text-yellow-400" />,
      title: 'Proven Track Record',
      description:
        'Our signals have consistently delivered positive returns with a documented win rate that speaks for itself. Real results from real traders.',
      stats: 'Proven results'
    }
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
            <Zap className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-blue-200 text-sm font-medium">
              Why Choose MarketPulse
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything You Need to
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
              {' '}
              Succeed in Trading
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed">
            We've combined cutting-edge AI technology with proven trading
            strategies to create the most comprehensive trading signal platform
            available. Join thousands of traders who are already achieving
            consistent profits.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-blue-500/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">
                {feature.title}
              </h3>

              <p className="text-slate-400 mb-4 leading-relaxed">
                {feature.description}
              </p>

              <div className="flex items-center text-sm text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                {feature.stats}
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof Section */}
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-12 mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Join the Success Stories
            </h3>
            <p className="text-slate-400 text-lg">
              See what our traders are saying about their results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">
                500+
              </div>
              <div className="text-slate-400">Active Traders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">
                $2.5M+
              </div>
              <div className="text-slate-400">Total Profits Generated</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">
                4.9/5
              </div>
              <div className="text-slate-400">Average Rating</div>
            </div>
          </div>
        </div>

        {/* Performance Guarantee Section */}
        <div className="text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-8">
              <Shield className="w-5 h-5 text-emerald-400 mr-3" />
              <span className="text-emerald-200 text-sm font-medium">
                💰 No Loss Guarantee
              </span>
            </div>

            <h3 className="text-3xl font-bold text-white mb-6">
              What if the signals don't perform well?
            </h3>

            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 max-w-3xl mx-auto mb-8">
              <p className="text-lg text-slate-200 mb-6 leading-relaxed">
                We're so confident in our signals that we offer a{' '}
                <strong>Monthly No Loss Guarantee</strong>. If our signals
                result in a net loss for any month, you'll receive a{' '}
                <strong>full refund</strong> for that billing cycle.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-white">
                      No Questions Asked
                    </div>
                    <div className="text-sm text-slate-400">
                      Automatic refund if we don't deliver
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-white">
                      Monthly Protection
                    </div>
                    <div className="text-sm text-slate-400">
                      Covered every month, not just the first
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-white">
                      Transparent Tracking
                    </div>
                    <div className="text-sm text-slate-400">
                      Real-time performance monitoring
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-white">
                      Instant Refunds
                    </div>
                    <div className="text-sm text-slate-400">
                      Processed within 24 hours
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button
                  variant="slim"
                  className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 text-lg font-semibold"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Start Your Free Trial
                  <TrendingUp className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/signin">
                <Button
                  variant="slim"
                  className="group bg-transparent border-2 border-slate-600 hover:border-slate-500 text-white px-8 py-4 text-lg font-semibold"
                >
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
