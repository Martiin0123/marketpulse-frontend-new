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
  AlertTriangle
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                <Logo width={150} height={40} />
              </div>
              <p className="text-gray-400 mb-6 max-w-sm">
                AI-powered simulated trading platform for educational purposes.
                Practice trading strategies and learn market analysis in a
                risk-free environment.
              </p>
              <div className="flex items-center space-x-2 bg-yellow-900/20 text-yellow-200 p-3 rounded-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  Simulated Trading Only - No Real Money
                </span>
              </div>
              <div className="flex space-x-4">
                <a
                  href="https://twitter.com/marketpulse"
                  className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors group"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
                <a
                  href="https://github.com/marketpulse"
                  className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors group"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
                <a
                  href="https://linkedin.com/company/marketpulse"
                  className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors group"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-gray-400 group-hover:text-white" />
                </a>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h3 className="text-white font-semibold mb-6">Platform</h3>
              <ul className="space-y-4">
                <li>
                  <Link
                    href="/dashboard"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signals"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Trading Signals
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Pricing Plans
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Pages */}
            <div>
              <h3 className="text-white font-semibold mb-6">
                Legal Information
              </h3>
              <ul className="space-y-4">
                <li>
                  <Link
                    href="/legal/impressum"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Impressum
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/risk-disclosure"
                    className="text-gray-400 hover:text-purple-400 transition-colors"
                  >
                    Risk Disclosure
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-6">Contact</h3>
              <ul className="space-y-4 mb-6">
                <li>
                  <a
                    href="mailto:zangerl.martin@hotmail.com"
                    className="text-gray-400 hover:text-purple-400 transition-colors flex items-center"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Us
                  </a>
                </li>
                <li className="text-gray-400">
                  Martin Zangerl
                  <br />
                  Dorfstraße 22
                  <br />
                  6561 Ischgl
                  <br />
                  Austria
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            {/* Copyright */}
            <div className="text-center lg:text-left">
              <p className="text-gray-400">
                © {new Date().getFullYear()} MarketPulse. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                This is a simulated trading environment. No real money is
                involved.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 text-gray-400">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm">Secure Platform</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm">24/7 Simulation</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">AI-Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
