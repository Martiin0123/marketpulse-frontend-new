'use client';

import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowRight, Shield, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CTAProps {
  user: User | null | undefined;
}

export default function CTA({ user }: CTAProps) {
  return (
    <section className="relative py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border border-purple-500/20 p-12">
          <div className="text-center max-w-3xl mx-auto">
            {/* Guarantee Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-green-500/10 backdrop-blur-sm rounded-full border border-green-500/30 mb-8">
              <Shield className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-green-200 text-sm font-medium">
                30-Day Money-Back Guarantee
              </span>
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl font-bold text-white mb-6">
              Start Trading with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {' '}
                Confidence
              </span>
            </h2>

            {/* Benefits */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">7-Day Free Trial</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">No Credit Card Required</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">Cancel Anytime</span>
              </div>
            </div>

            {/* CTA Button */}
            {user ? (
              <Link href="/dashboard">
                <Button
                  variant="slim"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Access Dashboard
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Link href="/signin/signup">
                <Button
                  variant="slim"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}

            {/* Trust Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-gray-400">
              <div>50,000+ Active Traders</div>
              <div>94.2% Accuracy Rate</div>
              <div>$2.5B+ Volume</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
