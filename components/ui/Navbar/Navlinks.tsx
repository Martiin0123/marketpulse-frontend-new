'use client';

import Link from 'next/link';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import Logo from '@/components/icons/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectMethod } from '@/utils/auth-helpers/settings';
import { useState } from 'react';
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  BarChart3,
  Home,
  Users
} from 'lucide-react';

interface NavlinksProps {
  user?: any;
  subscription?: any;
}

export default function Navlinks({ user, subscription }: NavlinksProps) {
  const router = getRedirectMethod() === 'client' ? useRouter() : null;
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Generate avatar initials
  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  // Generate avatar color based on email
  const getAvatarColor = (email: string | null | undefined) => {
    if (!email) return 'bg-purple-500';
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500'
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Check if user has active subscription
  const hasActiveSubscription = false; // TEMPORARY: Force no subscription for testing
  // const hasActiveSubscription = Boolean(
  //   subscription &&
  //   subscription.status &&
  //   ['trialing', 'active'].includes(subscription.status as string)
  // );

  // Debug logging
  console.log('🔍 Navigation Debug:', {
    user: user?.email || 'No user',
    subscription: subscription
      ? {
          status: subscription.status,
          product: subscription.prices?.products?.name,
          id: subscription.id
        }
      : 'No subscription',
    hasActiveSubscription
  });

  const navLinks = [
    { href: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
    {
      href: '/pricing',
      label: 'Pricing',
      icon: <BarChart3 className="w-4 h-4" />
    },
    ...(user && hasActiveSubscription
      ? [
          {
            href: '/dashboard',
            label: 'Dashboard',
            icon: <TrendingUp className="w-4 h-4" />
          },
          {
            href: '/signals',
            label: 'Signals',
            icon: <BarChart3 className="w-4 h-4" />
          },
          {
            href: '/referrals',
            label: 'Referrals',
            icon: <Users className="w-4 h-4" />
          }
        ]
      : [])
  ];

  return (
    <div className="relative flex items-center justify-between py-4 px-6 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="relative">
            <Logo />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MarketPulse
          </span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActiveLink(link.href)
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Right Side - Auth */}
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="relative">
            {/* Avatar Button */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 group"
            >
              <div
                className={`w-8 h-8 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center text-white text-sm font-bold`}
              >
                {getInitials(user.email)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-white">
                  {user.email?.split('@')[0]}
                </div>
                <div className="text-xs text-gray-400">View profile</div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center text-white font-bold`}
                    >
                      {getInitials(user.email)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-400">Signed in</div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/account"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Account Settings</span>
                  </Link>

                  {hasActiveSubscription && (
                    <Link
                      href="/referrals"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      <span>Referral Program</span>
                    </Link>
                  )}

                  <form
                    onSubmit={(e) => {
                      handleRequest(e, SignOut, router);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <input type="hidden" name="pathName" value={pathname} />
                    <button
                      type="submit"
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link
              href="/signin"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 md:hidden">
          <div className="p-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActiveLink(link.href)
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
