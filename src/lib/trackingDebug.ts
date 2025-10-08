/**
 * Debug utilities for tracking system
 * Helps test and visualize the recently shown tracker
 */

import { getRecentlyShownStats, clearRecentlyShown } from './recentlyShownTracker';

const STORAGE_KEY = 'recently_shown_movies';

/**
 * Add fake tracking entries for testing
 */
export function addFakeTrackingData(hoursAgo: number, count: number = 5): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const shownMovies = stored ? JSON.parse(stored) : [];
    
    const timestamp = Date.now() - (hoursAgo * 60 * 60 * 1000);
    
    // Add fake movie IDs
    for (let i = 0; i < count; i++) {
      shownMovies.push({
        movieId: `fake-${hoursAgo}h-${Date.now()}-${i}`,
        shownAt: timestamp
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shownMovies));
  } catch (error) {
    console.error('Error adding fake tracking data:', error);
  }
}

/**
 * Get human-readable tracking stats
 */
export function getTrackingDebugInfo(): {
  count: number;
  oldestHours: number | null;
  hasOldEntries: boolean;
} {
  const stats = getRecentlyShownStats();
  
  // Convert days to hours for display
  const oldestHours = stats.oldestShownDaysAgo !== null 
    ? Math.floor(stats.oldestShownDaysAgo * 24)
    : null;
  
  // Check if there are entries older than 6 hours
  const hasOldEntries = oldestHours !== null && oldestHours >= 6;
  
  return {
    count: stats.count,
    oldestHours,
    hasOldEntries
  };
}

/**
 * Clear all tracking data
 */
export function clearAllTracking(): void {
  clearRecentlyShown();
}
