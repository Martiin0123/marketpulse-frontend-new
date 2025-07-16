'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useLoading } from './LoadingContext';

interface LoadingLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
}

export default function LoadingLink({
  href,
  children,
  className,
  target,
  rel,
  prefetch,
  replace,
  scroll,
  shallow,
  ...props
}: LoadingLinkProps) {
  const { setIsLoading } = useLoading();

  const handleClick = (e: React.MouseEvent) => {
    // Don't show loading for external links
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || target === '_blank') {
      return;
    }

    // Don't show loading for hash links
    if (href.startsWith('#')) {
      return;
    }

    // Show loading for internal navigation
    setIsLoading(true);
    
    // Set a timeout to hide loading in case navigation fails
    setTimeout(() => {
      setIsLoading(false);
    }, 5000);
  };

  return (
    <Link
      href={href}
      className={className}
      target={target}
      rel={rel}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}