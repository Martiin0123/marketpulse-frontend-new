'use client';

import { ReactNode } from 'react';
import { LoadingProvider as LoadingContextProvider } from './LoadingContext';
import LoadingSpinner from './LoadingSpinner';
import { useLoading } from './LoadingContext';

interface LoadingProviderProps {
  children: ReactNode;
}

function LoadingSpinnerWrapper() {
  const { isLoading } = useLoading();
  return <LoadingSpinner isVisible={isLoading} />;
}

export default function LoadingProvider({ children }: LoadingProviderProps) {
  return (
    <LoadingContextProvider>
      {children}
      <LoadingSpinnerWrapper />
    </LoadingContextProvider>
  );
}