'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Clock,
  Shield
} from 'lucide-react';

export default function Stats() {
  const [counts, setCounts] = useState({
    traders: 0,
    profits: 0,
    signals: 0,
    rating: 0
  });

  const stats = [
    {
      icon: <Users className="w-8 h-8 text-blue-400" />,
      value: counts.traders,
      suffix: '+',
      label: 'Active Traders',
      description: 'Join our growing community'
    },
    {
      icon: <DollarSign className="w-8 h-8 text-emerald-400" />,
      value: counts.profits,
      prefix: '$',
      suffix: 'M+',
      label: 'Profits Generated',
      description: 'Total profits from our signals'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-cyan-400" />,
      value: counts.signals,
      suffix: '+',
      label: 'Signals Delivered',
      description: 'Successful trading signals'
    },
    {
      icon: <Award className="w-8 h-8 text-yellow-400" />,
      value: counts.rating,
      suffix: '/5',
      label: 'Average Rating',
      description: 'From verified users'
    }
  ];

  useEffect(() => {
    const animateCounts = () => {
      const targets = {
        traders: 500,
        profits: 2.5,
        signals: 1500,
        rating: 4.9
      };

      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setCounts({
          traders: Math.floor(targets.traders * progress),
          profits: Number((targets.profits * progress).toFixed(1)),
          signals: Math.floor(targets.signals * progress),
          rating: Number((targets.rating * progress).toFixed(1))
        });

        if (currentStep >= steps) {
          clearInterval(interval);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    };

    // Start animation when component mounts
    const timer = setTimeout(animateCounts, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 backdrop-blur-sm rounded-full border border-emerald-500/30 mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-emerald-200 text-sm font-medium">
              Proven Results
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Real Numbers,
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              {' '}
              Real Results
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Our AI-powered trading signals have helped hundreds of traders
            achieve consistent profits. See the numbers that speak for
            themselves.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 text-center hover:border-emerald-500/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>

              <div className="text-4xl font-bold text-white mb-2">
                {stat.prefix || ''}
                {stat.value}
                {stat.suffix}
              </div>

              <div className="text-lg font-semibold text-emerald-400 mb-2">
                {stat.label}
              </div>

              <div className="text-sm text-slate-400">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Additional Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">24/7</div>
            <div className="text-slate-400">Market Monitoring</div>
          </div>

          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">100%</div>
            <div className="text-slate-400">Money Back Guarantee</div>
          </div>

          <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">95%</div>
            <div className="text-slate-400">Signal Accuracy</div>
          </div>
        </div>
      </div>
    </section>
  );
}
