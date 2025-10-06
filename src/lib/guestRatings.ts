import { supabase } from "@/integrations/supabase/client";

const GUEST_RATINGS_KEY = "movie_wizard_guest_ratings";
const GUEST_SKIPPED_KEY = "movie_wizard_skipped";

export interface GuestRating {
  movieId: string;
  rating: number;
  timestamp: string;
}

export function saveGuestRating(movieId: string, rating: number): void {
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
}

export function getGuestRatings(): GuestRating[] {
  try {
    const data = localStorage.getItem(GUEST_RATINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing guest ratings:", error);
    return [];
  }
}

export function getGuestRatedMovieIds(): string[] {
  return getGuestRatings().map(r => r.movieId);
}

export function getGuestRatedCount(): number {
  return getGuestRatings().length;
}

export function clearGuestRatings(): void {
  localStorage.removeItem(GUEST_RATINGS_KEY);
  localStorage.removeItem(GUEST_SKIPPED_KEY);
}

export function saveGuestSkipped(movieIds: string[]): void {
  localStorage.setItem(GUEST_SKIPPED_KEY, JSON.stringify(movieIds));
}

export function getGuestSkipped(): string[] {
  try {
    const data = localStorage.getItem(GUEST_SKIPPED_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing guest skipped:", error);
    return [];
  }
}

export async function migrateGuestRatingsToUser(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const guestRatings = getGuestRatings();
    
    if (guestRatings.length === 0) {
      return { success: true, count: 0 };
    }
    
    // Prepare ratings for batch insert
    const ratingsToInsert = guestRatings.map(rating => ({
      user_id: userId,
      media_id: rating.movieId,
      media_type: 'movie',
      user_rating: rating.rating,
    }));
    
    // Insert ratings (upsert to handle duplicates)
    const { error } = await supabase
      .from('user_ratings')
      .upsert(ratingsToInsert, {
        onConflict: 'user_id,media_id,media_type'
      });
    
    if (error) {
      console.error("Error migrating ratings:", error);
      return { success: false, count: 0, error: error.message };
    }
    
    // Clear guest data after successful migration
    clearGuestRatings();
    
    return { success: true, count: guestRatings.length };
  } catch (error) {
    console.error("Error migrating guest ratings:", error);
    return { success: false, count: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
