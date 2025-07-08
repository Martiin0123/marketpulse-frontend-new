'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, User as UserIcon, LogOut, Users } from 'lucide-react';
import { SignOut } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { User } from '@supabase/supabase-js';
import { Tables } from '@/types_db';

interface NavbarClientProps {
  user: User | null;
}

export default function NavbarClient({ user }: NavbarClientProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  // Generate avatar initials
  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  // Generate avatar color based on email
  const getAvatarColor = (email: string | null | undefined) => {
    if (!email) return 'bg-blue-500';
    const colors = [
      'bg-blue-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-indigo-500',
      'bg-slate-500'
    ];
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-all duration-200 group"
      >
        <div
          className={`w-8 h-8 rounded-lg ${getAvatarColor(user?.email)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
        >
          {getInitials(user?.email)}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
            {user?.email?.split('@')[0]}
          </div>
          <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
            View profile
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-all duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-lg ${getAvatarColor(user?.email)} flex items-center justify-center text-white font-bold shadow-sm`}
              >
                {getInitials(user?.email)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {user?.email}
                </div>
                <div className="text-xs text-slate-400">Signed in</div>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href="/account"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
            >
              <UserIcon className="w-4 h-4" />
              <span>Account Settings</span>
            </Link>

            <Link
              href="/referrals"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span>Referral Program</span>
            </Link>

            <form
              onSubmit={(e) => {
                handleRequest(e, SignOut, router);
                setIsDropdownOpen(false);
              }}
            >
              <input type="hidden" name="pathName" value="/" />
              <button
                type="submit"
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
