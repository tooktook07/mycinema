import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Get page title based on route
    const getPageTitle = (pathname: string): string => {
      if (pathname === '/') return 'Home - CineMatch';
      if (pathname === '/movies') return 'Browse Movies - CineMatch';
      if (pathname === '/discover') return 'Discover Mode - CineMatch';
      if (pathname === '/watchlist') return 'My Watchlist - CineMatch';
      if (pathname === '/signup') return 'Sign Up - CineMatch';
      if (pathname === '/login' || pathname === '/auth') return 'Login - CineMatch';
      if (pathname === '/account') return 'Account Settings - CineMatch';
      if (pathname === '/profile') return 'My Profile - CineMatch';
      if (pathname === '/help') return 'Help - CineMatch';
      if (pathname.startsWith('/movie/')) return 'Movie Details - CineMatch';
      if (pathname.startsWith('/genre/')) return 'Genre Archive - CineMatch';
      if (pathname.startsWith('/person/')) return 'Person Archive - CineMatch';
      if (pathname.startsWith('/keyword/')) return 'Keyword Archive - CineMatch';
      if (pathname.startsWith('/year/')) return 'Year Archive - CineMatch';
      if (pathname.startsWith('/language/')) return 'Language Archive - CineMatch';
      if (pathname.startsWith('/company/')) return 'Production Company Archive - CineMatch';
      if (pathname.startsWith('/country/')) return 'Country Archive - CineMatch';
      if (pathname.startsWith('/streaming/')) return 'Streaming Service Archive - CineMatch';
      return 'CineMatch';
    };

    const pageTitle = getPageTitle(location.pathname);
    
    // Update document title
    document.title = pageTitle;

    // Send page_view event to GA4 with retry logic (max 10 attempts)
    let retryCount = 0;
    const maxRetries = 10;
    
    const sendPageView = () => {
      if (typeof window.gtag !== 'undefined') {
        try {
          window.gtag('event', 'page_view', {
            page_title: pageTitle,
            page_location: window.location.href,
            page_path: location.pathname + location.search,
          });
          console.log('GA4 page view tracked:', pageTitle);
        } catch (error) {
          console.error('GA tracking error:', error);
        }
      } else if (retryCount < maxRetries) {
        // Retry after a short delay if gtag is not loaded yet
        retryCount++;
        setTimeout(sendPageView, 100);
      } else {
        console.warn('GA4 gtag not available after', maxRetries, 'attempts');
      }
    };

    sendPageView();
  }, [location]);
};
