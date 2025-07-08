'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/utils/auth-context';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Settings,
  Users,
  BarChart3,
  ChevronDown,
  Menu,
  X,
  Zap,
  DollarSign,
  FileText,
  Home,
  Crown
} from 'lucide-react';

export default function NavbarClient() {
  const { user, subscription, loading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
      setIsDropdownOpen(false);
    }
  };

  // Generate avatar initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on email
  const getAvatarColor = () => {
    if (!user?.email) return 'bg-blue-500';
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-cyan-500'
    ];
    const index = user.email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Check if link is active
  const isActive = (path: string) => {
    if (path === '/') return pathname === path;
    return pathname.startsWith(path);
  };

  // Navigation links
  const navigationLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/performance-reports', label: 'Reports', icon: FileText, protected: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-6">
          <div className="h-4 w-16 bg-slate-700 animate-pulse rounded"></div>
          <div className="h-4 w-20 bg-slate-700 animate-pulse rounded"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-24 bg-slate-700 animate-pulse rounded-lg"></div>
          <div className="h-8 w-8 bg-slate-700 animate-pulse rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Center Navigation Links */}
      <div className="hidden md:flex items-center space-x-6">
        {navigationLinks.map((link) => {
          const Icon = link.icon;
          const shouldShow = !link.protected || (user && subscription);
          
          if (!shouldShow) return null;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right Side - Dashboard + User Section */}
      <div className="flex items-center space-x-3">
        {user ? (
          <>
            {/* Dashboard Button */}
            {subscription && (
              <Link href="/dashboard">
                <Button
                  variant="slim"
                  className={`flex items-center space-x-2 h-9 px-4 py-2 ${
                    isActive('/dashboard') 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                      : ''
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            )}

            {/* User Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-800/50 transition-colors duration-200"
              >
                <div className={`w-8 h-8 rounded-full ${getAvatarColor()} flex items-center justify-center text-white text-sm font-medium`}>
                  {getInitials(user?.user_metadata?.full_name)}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-700">
                    <p className="text-sm font-medium text-white">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    {subscription && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">
                          {subscription.prices?.products?.name || 'Pro'} Plan
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      href="/account"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </Link>
                    <Link
                      href="/referrals"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Users className="w-4 h-4" />
                      <span>Referrals</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-700 py-2">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Auth Buttons for non-authenticated users */
          <div className="flex items-center space-x-3">
            <Link href="/signin">
              <Button variant="slim" className="text-sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signin">
              <Button className="text-sm flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Get Started</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors duration-200"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-slate-300" />
          ) : (
            <Menu className="w-5 h-5 text-slate-300" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 md:hidden">
          <div className="px-4 py-4 space-y-2">
            {navigationLinks.map((link) => {
              const Icon = link.icon;
              const shouldShow = !link.protected || (user && subscription);
              
              if (!shouldShow) return null;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.href)
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
