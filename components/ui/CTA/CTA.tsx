'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowRight, Zap, TrendingUp, Target } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CTAProps {
  user: User | null | undefined;
}

export default function CTA({ user }: CTAProps) {
  return (
    <section className="relative py-20 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
        <div className="absolute top-10 left-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-500 transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Header Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-purple-500/30 mb-8">
            <Zap className="w-4 h-4 text-yellow-400 mr-2" />
            <span className="text-purple-200 text-sm font-medium">
              Limited Time Offer
            </span>
          </div>

          {/* Main Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8">
            Ready to Start Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {' '}
              Trading Journey?
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Join thousands of successful traders who trust MarketPulse for their
            trading decisions. Start with our free trial and experience the
            difference AI-powered trading can make.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-gray-300 font-medium">
                7-Day Free Trial
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-300 font-medium">
                No Credit Card Required
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-pink-400" />
              </div>
              <span className="text-gray-300 font-medium">Cancel Anytime</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            {user ? (
              <Link href="/dashboard">
                <Button
                  variant="slim"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-5 text-xl font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  Access Your Dashboard
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signin/signup">
                  <Button
                    variant="slim"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-5 text-xl font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                  >
                    Start Free Trial
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <Link href="/pricing">
                  <button className="flex items-center justify-center px-10 py-5 text-xl font-semibold text-white border-2 border-white/30 rounded-xl hover:border-white/50 hover:bg-white/5 transition-all duration-300">
                    View Pricing
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Join 50,000+ traders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm">94.2% accuracy rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm">$2.5B+ trading volume</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative elements */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-purple-400/50 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-400/50 rounded-full animate-bounce delay-150"></div>
            <div className="w-3 h-3 bg-blue-400/50 rounded-full animate-bounce delay-300"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
