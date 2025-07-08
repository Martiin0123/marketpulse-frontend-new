import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export function Skeleton({
  className = '',
  height = 'h-4',
  width = 'w-full',
  rounded = true
}: SkeletonProps) {
  return (
    <div
      className={`
        animate-pulse bg-slate-700 
        ${height} ${width} 
        ${rounded ? 'rounded' : ''} 
        ${className}
      `}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-4">
      <Skeleton height="h-6" width="w-3/4" />
      <Skeleton height="h-4" width="w-full" />
      <Skeleton height="h-4" width="w-2/3" />
    </div>
  );
}

export function NavbarSkeleton() {
  return (
    <div className="flex justify-between items-center h-20">
      <Skeleton height="h-8" width="w-32" />
      <div className="flex space-x-4">
        <Skeleton height="h-10" width="w-20" />
        <Skeleton height="h-10" width="w-24" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height="h-8" width="w-1/3" />
        <Skeleton height="h-4" width="w-1/2" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-4">
        <Skeleton height="h-4" width="w-1/4" />
        <Skeleton height="h-4" width="w-1/4" />
        <Skeleton height="h-4" width="w-1/4" />
        <Skeleton height="h-4" width="w-1/4" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton height="h-4" width="w-1/4" />
          <Skeleton height="h-4" width="w-1/4" />
          <Skeleton height="h-4" width="w-1/4" />
          <Skeleton height="h-4" width="w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function AuthLoadingState() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400">Loading your account...</p>
      </div>
    </div>
  );
}
