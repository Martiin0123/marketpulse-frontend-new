import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';
import Navlinks from './Navlinks';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-white font-bold text-xl">PrimeScope</span>
            </Link>
          </div>
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/pricing"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/referrals"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Referrals
            </Link>
          </div>
          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/account">
                  <Button variant="slim">Account</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="slim">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/signin">
                  <Button variant="slim">Sign In</Button>
                </Link>
                <Link href="/signin">
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
