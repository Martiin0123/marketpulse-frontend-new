'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  CheckCircle,
  Zap,
  Target,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface CTAProps {
  user: User | null | undefined;
}

export default function CTA({ user }: CTAProps) {
  return (
    <section className="relative py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl border border-blue-500/20 p-12">
          <div className="text-center max-w-4xl mx-auto">
            {/* Urgency Badge */}

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
                {' '}
                Trading Results?
              </span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl text-slate-300 mb-12 leading-relaxed">
              Stop leaving money on the table. Join thousands of traders who are
              already achieving consistent profits with our AI-powered signals.
              Start your journey to financial freedom today.
            </p>

            {/* Value Props Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">
                    Risk-Free Guarantee
                  </div>
                  <div className="text-sm text-slate-400">
                    Full refund if we don't deliver
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Instant Access</div>
                  <div className="text-sm text-slate-400">
                    Start receiving signals in 2 minutes
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Cancel Anytime</div>
                  <div className="text-sm text-slate-400">
                    No long-term commitments
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="secondary" size="lg" className="group">
                    <Target className="w-5 h-5 mr-2" />
                    Access Your Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button variant="secondary" size="lg" className="group">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Start Trading Now
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/signin">
                    <Button variant="ghost" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Final Urgency Message */}
            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-slate-300 text-sm">
                <strong>Don't wait!</strong> Every day you delay is another day
                of missed opportunities. Join the traders who are already
                profiting from our AI signals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
