const GUEST_RATINGS_KEY = 'movie_wizard_guest_ratings';

export interface GuestRating {
  movieId: string;
  rating: number;
  timestamp: string;
}

export const saveGuestRating = (movieId: string, rating: number): void => {
  const ratings = getGuestRatings();
  const existingIndex = ratings.findIndex(r => r.movieId === movieId);
  
  const newRating: GuestRating = {
    movieId,
    rating,
    timestamp: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    ratings[existingIndex] = newRating;
  } else {
    ratings.push(newRating);
  }
  
  localStorage.setItem(GUEST_RATINGS_KEY, JSON.stringify(ratings));
};

export const getGuestRatings = (): GuestRating[] => {
  try {
    const stored = localStorage.getItem(GUEST_RATINGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading guest ratings:', error);
    return [];
  }
};

export const clearGuestRatings = (): void => {
  localStorage.removeItem(GUEST_RATINGS_KEY);
};

export const getGuestRatedCount = (): number => {
  return getGuestRatings().length;
};

export const getGuestRatedMovieIds = (): string[] => {
  return getGuestRatings().map(r => r.movieId);
};

export const migrateGuestRatingsToUser = async (userId: string): Promise<void> => {
  // This will be implemented when we add the full wizard guest support
  const ratings = getGuestRatings();
  console.log('Migrating guest ratings for user:', userId, ratings);
  // TODO: Save to database via Supabase
  clearGuestRatings();
};
