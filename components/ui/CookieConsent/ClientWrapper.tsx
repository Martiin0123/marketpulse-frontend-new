'use client';

import { useState, useEffect } from 'react';
import { CookieProvider } from './CookieProvider';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <CookieProvider>{children}</CookieProvider>;
}
