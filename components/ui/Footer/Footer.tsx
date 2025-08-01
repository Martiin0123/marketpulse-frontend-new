'use client';

import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import {
  Mail,
  Twitter,
  Github,
  Linkedin,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';
import { useState, useEffect } from 'react';
import { useCookieConsent } from '@/components/ui/CookieConsent';

interface FooterProps {
  user?: User | null;
  subscription?:
    | (Tables<'subscriptions'> & {
        prices:
          | (Tables<'prices'> & {
              products: Tables<'products'> | null;
            })
          | null;
      })
    | null;
}

export default function Footer({ user, subscription }: FooterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  let showConsent: (() => void) | undefined = undefined;
  try {
    showConsent = useCookieConsent().showConsent;
  } catch {
    showConsent = undefined;
  }

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Link href="/">
                <Logo />
              </Link>
            </div>
            <p className="text-slate-400 mb-6 max-w-md">
              Advanced AI-powered trading signals and market analysis to help
              you make informed trading decisions.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-slate-400 hover:text-blue-400 transition-colors"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-blue-400 transition-colors"
              >
                <span className="sr-only">GitHub</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/signals"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Trading Signals
                </Link>
              </li>
              {!subscription && (
                <li>
                  <Link
                    href="/pricing"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/dashboard"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/performance-reports"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Performance Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/performance-guarantee"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  No Loss Guarantee
                </Link>
              </li>
            </ul>
          </div>
          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/risk-disclosure"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Risk Disclosure
                </Link>
              </li>
              {mounted && showConsent && (
                <li>
                  <button
                    onClick={showConsent}
                    className="text-slate-400 hover:text-white transition-colors flex items-center"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Cookie Settings
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">
              © 2024 PrimeScope. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm mt-2 md:mt-0">
              Trading involves risk. Past performance does not guarantee future
              results.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
