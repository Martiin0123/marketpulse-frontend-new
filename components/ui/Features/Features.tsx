import { Brain, Shield, Zap, Target, Clock, BarChart2 } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: <Brain className="w-10 h-10 text-purple-400" />,
      title: 'AI-Powered Analysis',
      description:
        'Advanced machine learning algorithms analyze market patterns to deliver highly accurate trading signals.'
    },
    {
      icon: <BarChart2 className="w-10 h-10 text-blue-400" />,
      title: 'Real-Time Signals',
      description:
        'Get instant notifications for market opportunities with our comprehensive technical analysis system.'
    },
    {
      icon: <Shield className="w-10 h-10 text-green-400" />,
      title: 'Risk Management',
      description:
        'Built-in risk assessment tools help protect your portfolio with automated stop-loss suggestions.'
    }
  ];

  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full mb-6">
            <Target className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-purple-200 text-sm font-medium">
              Why Choose MarketPulse
            </span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">
            Trade Smarter with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {' '}
              Advanced Technology
            </span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 hover:border-purple-500/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="mb-6">{feature.icon}</div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-4">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
            <div className="text-3xl font-bold text-white mb-2">50,000+</div>
            <div className="text-gray-400">Active Traders</div>
          </div>
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
            <div className="text-3xl font-bold text-white mb-2">99.9%</div>
            <div className="text-gray-400">Uptime</div>
          </div>
          <div className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-gray-400">Market Monitoring</div>
          </div>
        </div>
      </div>
    </section>
  );
}
