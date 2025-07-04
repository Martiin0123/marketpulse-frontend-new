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
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Advanced Trading
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
              {' '}
              Features
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Everything you need to succeed in the markets with AI-powered
            insights and professional tools
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Real-time Signals */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-blue-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Real-time Signals
            </h3>
            <p className="text-slate-400">
              Get instant trading signals with high accuracy rates, powered by
              advanced AI algorithms
            </p>
          </div>
          {/* Risk Management */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-cyan-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-cyan-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Risk Management
            </h3>
            <p className="text-slate-400">
              Advanced position sizing and stop-loss strategies to protect your
              capital
            </p>
          </div>
          {/* Market Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-emerald-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Market Analysis
            </h3>
            <p className="text-slate-400">
              Deep market insights with technical and fundamental analysis tools
            </p>
          </div>
          {/* Portfolio Tracking */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-blue-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Portfolio Tracking
            </h3>
            <p className="text-slate-400">
              Monitor your performance with detailed analytics and performance
              metrics
            </p>
          </div>
          {/* Mobile Trading */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-cyan-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-cyan-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Mobile Trading
            </h3>
            <p className="text-slate-400">
              Trade anywhere with our mobile-optimized platform and real-time
              alerts
            </p>
          </div>
          {/* 24/7 Support */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-emerald-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              24/7 Support
            </h3>
            <p className="text-slate-400">
              Get help anytime with our dedicated support team and comprehensive
              documentation
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
