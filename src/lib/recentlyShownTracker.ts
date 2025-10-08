/**
 * Tracks recently shown movie recommendations to prevent repetition
 * Uses localStorage for both guests and logged-in users
 */

const STORAGE_KEY = 'recently_shown_movies';
const EXCLUSION_DAYS = 0.5; // Exclude movies for 12 hours after showing

interface ShownMovie {
  movieId: string;
  shownAt: number; // timestamp
}

/**
 * Get all recently shown movie IDs (within exclusion period)
 */
export function getRecentlyShownMovieIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const shownMovies: ShownMovie[] = JSON.parse(stored);
    const now = Date.now();
    const cutoffTime = now - (EXCLUSION_DAYS * 24 * 60 * 60 * 1000);

    // Filter out expired entries and return valid movie IDs
    const validMovies = shownMovies.filter(movie => movie.shownAt > cutoffTime);
    
    // Save cleaned list back to localStorage
    if (validMovies.length !== shownMovies.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validMovies));
    }

    return validMovies.map(movie => movie.movieId);
  } catch (error) {
    console.error('Error reading recently shown movies:', error);
    return [];
  }
}

/**
 * Mark movies as recently shown
 */
export function markMoviesAsShown(movieIds: string[]): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let shownMovies: ShownMovie[] = stored ? JSON.parse(stored) : [];
    
    const now = Date.now();
    const cutoffTime = now - (EXCLUSION_DAYS * 24 * 60 * 60 * 1000);

    // Remove expired entries
    shownMovies = shownMovies.filter(movie => movie.shownAt > cutoffTime);

    // Add new movies (avoid duplicates)
    const existingIds = new Set(shownMovies.map(m => m.movieId));
    movieIds.forEach(movieId => {
      if (!existingIds.has(movieId)) {
        shownMovies.push({ movieId, shownAt: now });
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(shownMovies));
  } catch (error) {
    console.error('Error marking movies as shown:', error);
  }
}

/**
 * Clear all tracking data (useful for testing or user preference)
 */
export function clearRecentlyShown(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recently shown movies:', error);
  }
}

/**
 * Clear the oldest half (6 hours) of tracking data
 * Keeps entries from the last 6 hours, removes older entries
 */
export function clearOldestHalfOfTracking(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const shownMovies: ShownMovie[] = JSON.parse(stored);
    const now = Date.now();
    const sixHoursAgo = now - (0.25 * 24 * 60 * 60 * 1000); // 6 hours

    // Keep only entries from the last 6 hours
    const recentMovies = shownMovies.filter(movie => movie.shownAt > sixHoursAgo);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentMovies));
  } catch (error) {
    console.error('Error clearing oldest tracking data:', error);
  }
}

/**
 * Check if there are entries older than 6 hours that can be cleared
 */
export function canClearOlderEntries(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const shownMovies: ShownMovie[] = JSON.parse(stored);
    const now = Date.now();
    const sixHoursAgo = now - (0.25 * 24 * 60 * 60 * 1000); // 6 hours

    // Check if there are any entries older than 6 hours
    return shownMovies.some(movie => movie.shownAt <= sixHoursAgo);
  } catch (error) {
    console.error('Error checking older entries:', error);
    return false;
  }
}

/**
 * Get stats about recently shown movies
 */
export function getRecentlyShownStats(): { count: number; oldestShownDaysAgo: number | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { count: 0, oldestShownDaysAgo: null };

    const shownMovies: ShownMovie[] = JSON.parse(stored);
    const now = Date.now();
    const cutoffTime = now - (EXCLUSION_DAYS * 24 * 60 * 60 * 1000);

    const validMovies = shownMovies.filter(movie => movie.shownAt > cutoffTime);
    
    if (validMovies.length === 0) {
      return { count: 0, oldestShownDaysAgo: null };
    }

    const oldestTimestamp = Math.min(...validMovies.map(m => m.shownAt));
    const oldestDaysAgo = Math.floor((now - oldestTimestamp) / (24 * 60 * 60 * 1000));

    return { count: validMovies.length, oldestShownDaysAgo: oldestDaysAgo };
  } catch (error) {
    console.error('Error getting recently shown stats:', error);
    return { count: 0, oldestShownDaysAgo: null };
  }
}
