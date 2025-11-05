import React, { createContext, useContext, useState, useEffect } from 'react';

interface CookieConsentContextType {
  hasConsent: boolean | null; // null = not decided yet
  acceptCookies: () => void;
  rejectCookies: () => void;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has already made a choice
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent !== null) {
      setHasConsent(storedConsent === 'true');
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setHasConsent(true);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'false');
    setHasConsent(false);
  };

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent');
    setHasConsent(null);
  };

  return (
    <CookieConsentContext.Provider value={{ hasConsent, acceptCookies, rejectCookies, resetConsent }}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};
