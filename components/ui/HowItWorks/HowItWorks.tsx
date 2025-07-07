'use client';

import {
  Zap,
  Bell,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle,
  Smartphone,
  BarChart3
} from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      title: 'AI Analysis',
      description:
        'Our advanced algorithms analyze 50+ market indicators in real-time to identify high-probability trading opportunities.',
      color: 'blue'
    },
    {
      icon: <Bell className="w-8 h-8 text-emerald-400" />,
      title: 'Instant Alerts',
      description:
        'Receive immediate notifications via email, SMS, and Discord the moment our AI detects a profitable opportunity.',
      color: 'emerald'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-cyan-400" />,
      title: 'Execute Trades',
      description:
        'Follow our precise entry and exit signals with recommended position sizing and risk management.',
      color: 'cyan'
    },
    {
      icon: <Shield className="w-8 h-8 text-purple-400" />,
      title: 'Track Performance',
      description:
        'Monitor your success with real-time analytics, win rates, and comprehensive performance reports.',
      color: 'purple'
    }
  ];

  return (
    <section className="py-20 bg-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 mb-6">
            <Zap className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-blue-200 text-sm font-medium">
              Simple 4-Step Process
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How It
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
              {' '}
              Works
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Get started in minutes with our simple, automated process. No
            complex setup required - just follow the signals and start
            profiting.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm z-10">
                {index + 1}
              </div>

              {/* Step Card */}
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 h-full hover:border-blue-500/50 transition-all duration-300 group-hover:scale-105">
                <div
                  className={`w-16 h-16 bg-gradient-to-br from-${step.color}-500/20 to-${step.color}-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {step.icon}
                </div>

                <h3 className="text-xl font-semibold text-white mb-4">
                  {step.title}
                </h3>

                <p className="text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow (except for last step) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-lg font-semibold text-white mb-2">
              Mobile Ready
            </div>
            <div className="text-slate-400 text-sm">
              Get alerts on any device
            </div>
          </div>

          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-lg font-semibold text-white mb-2">
              Real-time Analytics
            </div>
            <div className="text-slate-400 text-sm">
              Track performance instantly
            </div>
          </div>

          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-lg font-semibold text-white mb-2">
              No Setup Required
            </div>
            <div className="text-slate-400 text-sm">
              Start in under 2 minutes
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
