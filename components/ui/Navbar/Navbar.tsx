import { createClient } from '@/utils/supabase/server';
import { getSubscription } from '@/utils/supabase/queries';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Logo from '@/components/icons/Logo';
import NavbarClient from './NavbarClient';

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

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
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            {!subscription && (
              <>
                <Link
                  href="/pricing"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </>
            )}
            <Link
              href="/performance-reports"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Reports
            </Link>
            <Link
              href="/performance-guarantee"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Performance Guarantee
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
