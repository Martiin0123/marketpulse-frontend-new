import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

export default function Stats() {
  const stats = [
    {
      icon: <Users className="w-8 h-8 text-purple-400" />,
      number: '50,000+',
      label: 'Active Traders',
      description: 'Trust our platform daily'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      number: '94.2%',
      label: 'Signal Accuracy',
      description: 'Proven track record'
    },
    {
      icon: <DollarSign className="w-8 h-8 text-yellow-400" />,
      number: '$2.5B+',
      label: 'Trading Volume',
      description: 'Processed monthly'
    },
    {
      icon: <Target className="w-8 h-8 text-pink-400" />,
      number: '15,000+',
      label: 'Successful Trades',
      description: 'This month alone'
    }
  ];

  return (
    <section className="relative py-20 bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Trusted by Thousands of
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {' '}
              Successful Traders
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join a growing community of traders who have transformed their
            trading game with MarketPulse
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 hover:border-purple-500/40 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative">
                {/* Icon */}
                <div className="mb-4">{stat.icon}</div>

                {/* Number */}
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>

                {/* Label */}
                <div className="text-lg font-semibold text-purple-200 mb-2">
                  {stat.label}
                </div>

                {/* Description */}
                <div className="text-gray-400 text-sm">{stat.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-3"></div>
            <span className="text-green-200 font-medium">
              Real-time data updated every second
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
