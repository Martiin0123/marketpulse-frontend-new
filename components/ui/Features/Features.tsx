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

          {/* Market Analysis */}
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
              Market Analysis
            </h3>
            <p className="text-slate-400">
              Deep market insights with technical and fundamental analysis tools
            </p>
          </div>

          {/* 24/7 Support */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-blue  -500/50 transition-all duration-300">
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

        {/* Performance Guarantee FAQ */}
        <div className="mt-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-6 py-3 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-8">
              <Shield className="w-5 h-5 text-emerald-400 mr-3" />
              <span className="text-emerald-200 text-sm font-medium">
                Performance Guarantee
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6">
              What if the signals don't perform well?
            </h3>

            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 max-w-3xl mx-auto">
              <p className="text-lg text-slate-200 mb-4 leading-relaxed">
                We believe in transparency. If the signals we publish on our
                platform result in a net loss for the month, you'll receive a
                full refund for that billing cycle.
              </p>
              <p className="text-slate-400 text-sm">
                You don't need to prove anything — your personal trades are not
                our responsibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
