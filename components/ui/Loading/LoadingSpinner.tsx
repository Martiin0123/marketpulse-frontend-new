'use client';

interface LoadingSpinnerProps {
  isVisible: boolean;
}

export default function LoadingSpinner({ isVisible }: LoadingSpinnerProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 w-full h-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
      style={{
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <div className="relative">
        {/* Spinning circle */}
        <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 border-r-cyan-500 rounded-full animate-spin"></div>
        
        {/* Pulsing inner circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
      </div>
      
      {/* Loading text */}
      <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 translate-y-8">
        <div className="text-white text-lg font-medium animate-pulse">Loading...</div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}