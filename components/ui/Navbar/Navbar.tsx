import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Logo from '@/components/icons/Logo';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const supabase = createClient();
  const user = await getUser(supabase);
  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/">
            <Logo />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="relative px-4 py-2 text-slate-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-slate-800/50 group"
            >
              <span className="relative z-10">Home</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>
            {!subscription && (
              <>
                <Link
                  href="/pricing"
                  className="relative px-4 py-2 text-slate-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-slate-800/50 group"
                >
                  <span className="relative z-10">Pricing</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </Link>
              </>
            )}
            <Link
              href="/performance-reports"
              className="relative px-4 py-2 text-slate-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-slate-800/50 group"
            >
              <span className="relative z-10">Reports</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>
            <Link
              href="/no-loss-guarantee"
              className="relative px-4 py-2 text-slate-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-slate-800/50 group"
            >
              <span className="relative z-10">No Loss Guarantee</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="slim">Dashboard</Button>
                </Link>
                <NavbarClient user={user} />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/signin">
                  <Button variant="slim">Sign In</Button>
                </Link>
                <Link href="/signin/signup">
                  <Button variant="slim">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
