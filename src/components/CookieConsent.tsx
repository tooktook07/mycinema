import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';
import { useState } from 'react';

export const CookieConsent = () => {
  const { hasConsent, acceptCookies, rejectCookies } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(true);

  // Don't show banner if user has already made a choice or manually closed it
  if (hasConsent !== null || !isVisible) {
    return null;
  }

  const handleAccept = () => {
    acceptCookies();
    setIsVisible(false);
  };

  const handleReject = () => {
    rejectCookies();
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-6xl mx-auto bg-card border border-border rounded-lg shadow-lg backdrop-blur-sm">
        <div className="relative p-4 sm:p-6">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Close banner"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0">
              <Cookie className="h-8 w-8 text-primary" />
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Cookie Preferences
              </h3>
              <p className="text-sm text-muted-foreground">
                We use cookies and analytics to improve your experience and understand how you use our site. 
                You can choose to accept or decline tracking cookies. Essential cookies are always enabled.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleReject}
                className="w-full sm:w-auto"
              >
                Reject
              </Button>
              <Button
                onClick={handleAccept}
                className="w-full sm:w-auto"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
