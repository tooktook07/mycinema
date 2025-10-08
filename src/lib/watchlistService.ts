import { supabase } from "@/integrations/supabase/client";
import { Movie } from "@/data/types";

export interface WatchlistLimit {
  canAdd: boolean;
  current: number;
  limit: number | null;
  tier: string;
}

export const checkWatchlistLimit = async (userId: string): Promise<WatchlistLimit> => {
  // Get user's subscription tier
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .single();

  if (profileError) throw profileError;

  const tier = profile?.subscription_tier || 'free';
  
  // Get current watchlist count using the database function
  const { data: countData, error: countError } = await supabase
    .rpc('get_user_watchlist_count', { p_user_id: userId });

  if (countError) throw countError;

  const current = countData || 0;
  const limit = tier === 'pro' ? null : 10; // null = unlimited for pro
  const canAdd = tier === 'pro' || current < 10;

  return { canAdd, current, limit, tier };
};

export const addToWatchlist = async (userId: string, movieId: string): Promise<{ success: boolean; error?: string }> => {
  // Check limit first
  const limitCheck = await checkWatchlistLimit(userId);
  
  if (!limitCheck.canAdd) {
    return { success: false, error: 'Watchlist limit reached' };
  }

  // Check if rating exists
  const { data: existing } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('media_id', movieId)
    .eq('media_type', 'movie')
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('user_ratings')
      .update({ in_watchlist: true })
      .eq('id', existing.id);
    
    if (error) return { success: false, error: error.message };
  } else {
    // Create new record with null rating
    const { error } = await supabase
      .from('user_ratings')
      .insert({
        user_id: userId,
        media_id: movieId,
        media_type: 'movie',
        in_watchlist: true,
        user_rating: null
      });
    
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
};

export const removeFromWatchlist = async (userId: string, movieId: string): Promise<void> => {
  const { data: existing } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('media_id', movieId)
    .eq('media_type', 'movie')
    .single();

  if (existing) {
    // If there's a rating, keep the record but set watchlist to false
    if (existing.user_rating !== null) {
      await supabase
        .from('user_ratings')
        .update({ in_watchlist: false })
        .eq('id', existing.id);
    } else {
      // If no rating, delete the record
      await supabase
        .from('user_ratings')
        .delete()
        .eq('id', existing.id);
    }
  }
};

export const getWatchlistMovies = async (userId: string): Promise<Movie[]> => {
  const { data, error } = await supabase
    .from('user_ratings')
    .select(`
      media_id,
      movies (*)
    `)
    .eq('user_id', userId)
    .eq('media_type', 'movie')
    .eq('in_watchlist', true);

  if (error) throw error;

  // Transform the data to return just the movies
  return (data || [])
    .filter(item => item.movies)
    .map(item => ({
      id: (item.movies as any).id,
      title: (item.movies as any).title,
      rating: (item.movies as any).rating,
      year: (item.movies as any).year,
      genre: (item.movies as any).genres || [],
      poster: (item.movies as any).poster,
      imdbId: (item.movies as any).imdb_id,
      plot: (item.movies as any).plot,
      director: (item.movies as any).director,
      actors: (item.movies as any).actors,
      runtime: (item.movies as any).runtime,
      voteCount: (item.movies as any).vote_count,
      originalLanguage: (item.movies as any).original_language,
      imdbRating: (item.movies as any).imdb_rating,
      imdbVotes: (item.movies as any).imdb_votes,
      metascore: (item.movies as any).metascore,
    }));
};

export const isInWatchlist = async (userId: string, movieId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('user_ratings')
    .select('in_watchlist')
    .eq('user_id', userId)
    .eq('media_id', movieId)
    .eq('media_type', 'movie')
    .maybeSingle();

  return data?.in_watchlist || false;
};
