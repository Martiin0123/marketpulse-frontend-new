'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Shield, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CookieConsentProps {
  onAccept: () => void;
  onReject: () => void;
  onCustomize: () => void;
}

export default function CookieConsent({
  onAccept,
  onReject,
  onCustomize
}: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  // Don't render anything until mounted to avoid SSR issues
  if (!mounted) {
    return null;
  }

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setIsVisible(false);
    onReject();
  };

  const handleCustomize = () => {
    setIsVisible(false);
    onCustomize();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Cookie className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white mb-1">
                  We use cookies to enhance your experience
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We use cookies and similar technologies to provide, protect,
                  and improve our services. This includes analytics, security,
                  and personalized content. By clicking "Accept All", you
                  consent to our use of cookies.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={handleReject}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              Reject All
            </Button>
            <Button
              onClick={handleCustomize}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Customize
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700"
            >
              Accept All
            </Button>
          </div>

          {/* Close button */}
          <button
            onClick={handleReject}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
