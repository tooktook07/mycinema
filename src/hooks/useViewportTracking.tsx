import { useEffect, useRef } from 'react';
import { markMoviesAsShown } from '@/lib/recentlyShownTracker';

/**
 * Custom hook to track when a movie card enters the viewport
 * Only marks the movie as "shown" when it's actually visible to the user
 * 
 * @param movieId - The ID of the movie to track
 * @param enabled - Whether tracking is enabled
 * @returns ref - Attach this ref to the element you want to track
 */
export function useViewportTracking(movieId: string, enabled: boolean = false) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasTrackedRef.current || !elementRef.current) {
      return;
    }

    const element = elementRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Track when 50% of the card is visible
          if (entry.isIntersecting && !hasTrackedRef.current) {
            hasTrackedRef.current = true;
            markMoviesAsShown([movieId]);
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the element is visible
        rootMargin: '0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [movieId, enabled]);

  return elementRef;
}
