import {
  TrendingUp,
  BarChart3,
  Bell,
  Shield,
  Zap,
  Target,
  Clock,
  Brain,
  Eye,
  Smartphone
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Brain className="w-12 h-12 text-purple-400" />,
      title: 'AI-Powered Signals',
      description:
        'Advanced machine learning algorithms analyze market patterns to deliver highly accurate trading signals in real-time.',
      highlights: ['99.2% uptime', 'Sub-second latency', 'Deep learning models']
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-blue-400" />,
      title: 'Technical Analysis',
      description:
        'Comprehensive technical indicators including RSI, MACD, Bollinger Bands, and custom proprietary indicators.',
      highlights: ['50+ indicators', 'Custom alerts', 'Pattern recognition']
    },
    {
      icon: <Bell className="w-12 h-12 text-yellow-400" />,
      title: 'Smart Notifications',
      description:
        'Never miss a trading opportunity with intelligent notifications that adapt to your trading style and preferences.',
      highlights: ['Push notifications', 'SMS alerts', 'Email reports']
    },
    {
      icon: <Shield className="w-12 h-12 text-green-400" />,
      title: 'Risk Management',
      description:
        'Built-in risk assessment tools help you manage your portfolio with automated stop-loss and take-profit suggestions.',
      highlights: ['Portfolio analysis', 'Risk scoring', 'Auto stop-loss']
    },
    {
      icon: <Clock className="w-12 h-12 text-orange-400" />,
      title: '24/7 Monitoring',
      description:
        'Round-the-clock market monitoring ensures you never miss important market movements, even while you sleep.',
      highlights: ['Global markets', 'After-hours trading', 'Weekend crypto']
    },
    {
      icon: <Smartphone className="w-12 h-12 text-pink-400" />,
      title: 'Mobile Trading',
      description:
        'Trade on the go with our fully-featured mobile app, complete with real-time charts and instant execution.',
      highlights: ['iOS & Android', 'Offline charts', 'One-tap trading']
    }
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-8">
            <Zap className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-purple-200 text-sm font-medium">
              Cutting-Edge Features
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Everything You Need to
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {' '}
              Trade Like a Pro
            </span>
          </h2>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our comprehensive suite of trading tools gives you the edge you need
            to succeed in today's fast-paced markets
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 hover:border-purple-500/40 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative">
                {/* Icon */}
                <div className="mb-6">{feature.icon}</div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {feature.description}
                </p>

                {/* Highlights */}
                <div className="space-y-2">
                  {feature.highlights.map((highlight, highlightIndex) => (
                    <div
                      key={highlightIndex}
                      className="flex items-center text-sm text-purple-200"
                    >
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-3"></div>
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-30"></div>
            <div className="relative bg-gray-800/50 border border-purple-500/20 rounded-lg px-8 py-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-purple-400" />
                <Target className="w-6 h-6 text-pink-400" />
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Ready to Transform Your Trading?
              </h3>
              <p className="text-gray-300">
                Join thousands of successful traders using MarketPulse
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
