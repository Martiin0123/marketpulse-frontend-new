'use client';

import { useState } from 'react';
import { X, Cookie, Shield, BarChart3, Target, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: CookieSettings) => void;
}

interface CookieSettings {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export default function CookieModal({
  isOpen,
  onClose,
  onSave
}: CookieModalProps) {
  const [settings, setSettings] = useState<CookieSettings>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    preferences: false
  });

  const handleToggle = (key: keyof CookieSettings) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('cookie-settings', JSON.stringify(settings));
    localStorage.setItem('cookie-consent', 'customized');
    onSave(settings);
    onClose();
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    localStorage.setItem('cookie-settings', JSON.stringify(allAccepted));
    localStorage.setItem('cookie-consent', 'accepted');
    onSave(allAccepted);
    onClose();
  };

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    localStorage.setItem('cookie-settings', JSON.stringify(allRejected));
    localStorage.setItem('cookie-consent', 'rejected');
    onSave(allRejected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
              <Cookie className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Cookie Preferences
              </h3>
              <p className="text-sm text-slate-400">
                Customize your cookie settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Necessary Cookies */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-green-400 mr-2" />
                <h4 className="font-medium text-white">Necessary Cookies</h4>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-slate-400 mr-2">
                  Always Active
                </span>
                <div className="w-10 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              These cookies are essential for the website to function properly.
              They cannot be disabled.
            </p>
          </div>

          {/* Analytics Cookies */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <BarChart3 className="w-4 h-4 text-blue-400 mr-2" />
                <h4 className="font-medium text-white">Analytics Cookies</h4>
              </div>
              <button
                onClick={() => handleToggle('analytics')}
                className="flex items-center"
              >
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                    settings.analytics
                      ? 'bg-blue-500 justify-end'
                      : 'bg-slate-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Help us understand how visitors interact with our website by
              collecting and reporting information anonymously.
            </p>
          </div>

          {/* Marketing Cookies */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Target className="w-4 h-4 text-purple-400 mr-2" />
                <h4 className="font-medium text-white">Marketing Cookies</h4>
              </div>
              <button
                onClick={() => handleToggle('marketing')}
                className="flex items-center"
              >
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                    settings.marketing
                      ? 'bg-purple-500 justify-end'
                      : 'bg-slate-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Used to track visitors across websites to display relevant and
              engaging advertisements.
            </p>
          </div>

          {/* Preferences Cookies */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Settings className="w-4 h-4 text-orange-400 mr-2" />
                <h4 className="font-medium text-white">Preference Cookies</h4>
              </div>
              <button
                onClick={() => handleToggle('preferences')}
                className="flex items-center"
              >
                <div
                  className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                    settings.preferences
                      ? 'bg-orange-500 justify-end'
                      : 'bg-slate-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Allow the website to remember choices you make and provide
              enhanced, more personal features.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-700">
          <Button
            onClick={handleRejectAll}
            variant="secondary"
            className="flex-1"
          >
            Reject All
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Preferences
          </Button>
          <Button
            onClick={handleAcceptAll}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
