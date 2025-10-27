import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseSEOOptions {
  title?: string;
  skipTitleUpdate?: boolean;
}

export const useSEO = ({ title, skipTitleUpdate = false }: UseSEOOptions = {}) => {
  const location = useLocation();

  useEffect(() => {
    if (skipTitleUpdate) return;
    
    // Update document title based on provided title or route
    if (title) {
      document.title = title;
    }
  }, [title, skipTitleUpdate, location]);

  const getDefaultImage = () => {
    return window.location.origin + '/og-default.jpg';
  };

  const getSiteUrl = () => {
    return window.location.origin;
  };

  const getCurrentUrl = () => {
    return window.location.href;
  };

  return {
    getDefaultImage,
    getSiteUrl,
    getCurrentUrl,
  };
};
