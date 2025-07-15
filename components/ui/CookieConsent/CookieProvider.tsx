'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import CookieConsent from './CookieConsent';
import CookieModal from './CookieModal';

interface CookieSettings {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface CookieContextType {
  settings: CookieSettings;
  updateSettings: (settings: CookieSettings) => void;
  showConsent: () => void;
  hideConsent: () => void;
}

const CookieContext = createContext<CookieContextType | undefined>(undefined);

interface CookieProviderProps {
  children: ReactNode;
}

export function CookieProvider({ children }: CookieProviderProps) {
  const [settings, setSettings] = useState<CookieSettings>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });
  const [showConsent, setShowConsent] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('cookie-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing cookie settings:', error);
      }
    }

    // Check if consent has been given
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const updateSettings = (newSettings: CookieSettings) => {
    setSettings(newSettings);
    localStorage.setItem('cookie-settings', JSON.stringify(newSettings));
  };

  const handleAccept = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    updateSettings(allAccepted);
    setShowConsent(false);
  };

  const handleReject = () => {
    const allRejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    updateSettings(allRejected);
    setShowConsent(false);
  };

  const handleCustomize = () => {
    setShowModal(true);
  };

  const handleModalSave = (newSettings: CookieSettings) => {
    updateSettings(newSettings);
    setShowModal(false);
  };

  const contextValue: CookieContextType = {
    settings,
    updateSettings,
    showConsent: () => setShowConsent(true),
    hideConsent: () => setShowConsent(false)
  };

  return (
    <CookieContext.Provider value={contextValue}>
      {children}

      {/* Cookie Consent Banner */}
      {mounted && showConsent && (
        <CookieConsent
          onAccept={handleAccept}
          onReject={handleReject}
          onCustomize={handleCustomize}
        />
      )}

      {/* Cookie Settings Modal */}
      {mounted && (
        <CookieModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieProvider');
  }
  return context;
}
