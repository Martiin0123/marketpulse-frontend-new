import Link from 'next/link';
import Logo from '@/components/icons/Logo';
import NavbarClient from './NavbarClient';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <Logo />
          </Link>

          {/* Client-side navigation and auth */}
          <NavbarClient />
        </div>
      </div>
    </nav>
  );
}
