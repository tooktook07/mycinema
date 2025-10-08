import { supabase } from "@/integrations/supabase/client";

export interface RecommendationMovie {
  id: string;
  title: string;
  year: number;
  genre: string[];
  poster: string;
  rating: number;
  plot: string;
  imdbId: string;
  voteCount?: number;
  originalLanguage?: string;
  actors?: string;
  director?: string;
  runtime?: string;
  writing?: string;
  sound?: string;
  keywords?: string[];
  imdbRating?: number;
  imdbVotes?: number;
}

const RATING_THRESHOLD = 5; // User's liked movies threshold (Like rating = 5)
const CANDIDATE_RATING_THRESHOLD = 6.5; // Minimum quality for recommendations
const MIN_RATINGS_FOR_PERSONALIZATION = 5; // Minimum ratings needed for similarity algorithm

// Similarity weights
const WEIGHTS = {
  GENRE: 0.35,
  DIRECTOR: 0.20,
  ACTOR: 0.20,
  KEYWORD: 0.15,
  LANGUAGE: 0.10,
};

export async function getNextRecommendation(
  userId: string | null,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number }[]
): Promise<RecommendationMovie | null> {
  // If guest user, use guest-specific recommendation
  if (!userId && guestRatings) {
    return getNextRecommendationForGuest(guestRatings, excludeIds);
  }
  
  if (!userId) {
    return getFallbackRecommendation(excludeIds);
  }
  try {
    // Fetch user's rated movies
    const { data: userRatings } = await supabase
      .from('user_ratings')
      .select('media_id, user_rating')
      .eq('user_id', userId)
      .eq('media_type', 'movie')
      .not('user_rating', 'is', null);
    
    const ratedMovieIds = (userRatings || []).map(r => r.media_id).filter(Boolean) as string[];
    const allExcludedIds = [...ratedMovieIds, ...excludeIds];
    
    // Get movies the user liked (rating >= 5 - "Like" or "Love")
    const likedRatings = (userRatings || []).filter(r => (r.user_rating || 0) >= RATING_THRESHOLD);
    
    // If user has enough ratings, use similarity algorithm
    if (likedRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      const { data: likedMoviesData } = await supabase
        .from('movies')
        .select('genres, director, actors, keywords, original_language')
        .in('id', likedRatings.map(r => r.media_id));
      
      if (!likedMoviesData || likedMoviesData.length === 0) {
        return getFallbackRecommendation(allExcludedIds);
      }

      // Analyze user preferences
      const genreCounts: Record<string, number> = {};
      const directorCounts: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};
      const keywordCounts: Record<string, number> = {};
      const languageCounts: Record<string, number> = {};

      likedMoviesData.forEach(movie => {
        // Count genres
        (movie.genres || []).forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        
        // Count directors
        if (movie.director) {
          directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
        }
        
        // Count actors
        if (movie.actors) {
          movie.actors.split(',').forEach((actor: string) => {
            const cleanActor = actor.trim();
            if (cleanActor) {
              actorCounts[cleanActor] = (actorCounts[cleanActor] || 0) + 1;
            }
          });
        }
        
        // Count keywords
        (movie.keywords || []).forEach((keyword: string) => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
        
        // Count languages
        if (movie.original_language) {
          languageCounts[movie.original_language] = (languageCounts[movie.original_language] || 0) + 1;
        }
      });

      // Fetch candidate movies (prioritize IMDb ratings)
      let query = supabase
        .from('movies')
        .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes')
        .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
        .not('rating', 'is', null);

      if (allExcludedIds.length > 0) {
        query = query.not('id', 'in', `(${allExcludedIds.join(',')})`);
      }

      const { data: candidateMovies } = await query.limit(100);

      if (!candidateMovies || candidateMovies.length === 0) {
        return null;
      }

      // Calculate similarity scores
      const moviesWithScores = candidateMovies.map(movie => {
        let score = 0;
        
        // Use IMDB rating if available, otherwise TMDB rating
        const effectiveRating = movie.imdb_rating || movie.rating;
        const effectiveVotes = movie.imdb_votes || movie.vote_count;
        
        // Boost score for IMDB-verified movies
        if (movie.imdb_rating) {
          score += 0.5; // Bonus for having IMDB data
        }
        
        // Hidden gems detection (high IMDB but low TMDB votes)
        if (movie.imdb_rating >= 7.5 && (movie.vote_count || 0) < 5000) {
          score += 2.0; // Strong boost for hidden gems
        }
        
        // Genre similarity
        const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
        const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
        score += genreWeight * WEIGHTS.GENRE;
        
        // Director similarity
        if (movie.director && directorCounts[movie.director]) {
          score += WEIGHTS.DIRECTOR;
        }
        
        // Actor similarity
        let actorMatches = 0;
        if (movie.actors) {
          const movieActors = movie.actors.split(',').map((a: string) => a.trim());
          actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
        }
        const actorWeight = Math.min(actorMatches / 3, 1);
        score += actorWeight * WEIGHTS.ACTOR;
        
        // Keyword similarity
        const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
        const keywordWeight = Math.min(keywordMatches / 3, 1);
        score += keywordWeight * WEIGHTS.KEYWORD;
        
        // Language similarity
        if (movie.original_language && languageCounts[movie.original_language]) {
          score += WEIGHTS.LANGUAGE;
        }
        
        // Slight boost for popularity (use IMDB votes if available)
        const popularityBoost = Math.min((effectiveVotes || 0) / 10000, 0.1);
        score += popularityBoost;
        
        return { ...movie, similarityScore: score };
      });

      // Get the best match
      const bestMatch = moviesWithScores
        .sort((a, b) => b.similarityScore - a.similarityScore)[0];

      if (!bestMatch) return null;

      return {
        id: bestMatch.id,
        title: bestMatch.title,
        year: bestMatch.year,
        poster: bestMatch.poster || '',
        rating: bestMatch.rating || 0,
        imdbRating: bestMatch.imdb_rating,
        imdbVotes: bestMatch.imdb_votes,
        plot: bestMatch.plot || '',
        imdbId: bestMatch.imdb_id,
        voteCount: bestMatch.vote_count,
        originalLanguage: bestMatch.original_language,
        genre: bestMatch.genres || [],
        actors: bestMatch.actors || '',
        director: bestMatch.director || '',
        runtime: bestMatch.runtime || '',
        writing: bestMatch.writing || '',
        sound: bestMatch.sound || '',
        keywords: bestMatch.keywords || []
      };
    } else {
      // Fallback: Show popular movies for users with few/no ratings
      return getFallbackRecommendation(allExcludedIds);
    }
  } catch (error) {
    console.error("Error getting recommendation:", error);
    return null;
  }
}

async function getFallbackRecommendation(excludeIds: string[]): Promise<RecommendationMovie | null> {
  let query = supabase
    .from('movies')
    .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes')
    .or(`imdb_rating.gte.7.0,and(imdb_rating.is.null,rating.gte.7.0)`)
    .not('rating', 'is', null);

  // Prefer IMDb-verified movies for new users
  query = query.order('imdb_rating', { ascending: false, nullsFirst: false });
  query = query.order('vote_count', { ascending: false });

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: movies } = await query.limit(50);

  if (!movies || movies.length === 0) return null;

  // Randomly select from top-rated
  const randomIndex = Math.floor(Math.random() * movies.length);
  const movie = movies[randomIndex];

  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || '',
    rating: movie.rating || 0,
    imdbRating: movie.imdb_rating,
    imdbVotes: movie.imdb_votes,
    plot: movie.plot || '',
    imdbId: movie.imdb_id,
    voteCount: movie.vote_count,
    originalLanguage: movie.original_language,
    genre: movie.genres || [],
    actors: movie.actors || '',
    director: movie.director || '',
    runtime: movie.runtime || '',
    writing: movie.writing || '',
    sound: movie.sound || '',
    keywords: movie.keywords || []
  };
}

export async function getSimilarMovies(
  movieId: string,
  limit: number = 6
): Promise<RecommendationMovie[]> {
  try {
    // Get the reference movie
    const { data: referenceMovie } = await supabase
      .from('movies')
      .select('genres, director, actors, keywords, original_language')
      .eq('id', movieId)
      .single();

    if (!referenceMovie) return [];

    // Build preference counts from this single movie
    const genreCounts: Record<string, number> = {};
    const directorCounts: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    (referenceMovie.genres || []).forEach((genre: string) => {
      genreCounts[genre] = 1;
    });

    if (referenceMovie.director) {
      directorCounts[referenceMovie.director] = 1;
    }

    if (referenceMovie.actors) {
      referenceMovie.actors.split(',').forEach((actor: string) => {
        const cleanActor = actor.trim();
        if (cleanActor) {
          actorCounts[cleanActor] = 1;
        }
      });
    }

    (referenceMovie.keywords || []).forEach((keyword: string) => {
      keywordCounts[keyword] = 1;
    });

    if (referenceMovie.original_language) {
      languageCounts[referenceMovie.original_language] = 1;
    }

    // Fetch candidate movies (prioritize IMDb ratings)
    const { data: candidateMovies } = await supabase
      .from('movies')
      .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes')
      .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
      .not('rating', 'is', null)
      .neq('id', movieId)
      .limit(200);

    if (!candidateMovies || candidateMovies.length === 0) return [];

    // Calculate similarity scores (using same weights as main algorithm)
    const moviesWithScores = candidateMovies.map(movie => {
      let score = 0;

      // Genre similarity (40% weight)
      const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
      const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
      score += genreWeight * 0.40;

      // Director similarity (20% weight)
      if (movie.director && directorCounts[movie.director]) {
        score += 0.20;
      }

      // Actor similarity (25% weight)
      let actorMatches = 0;
      if (movie.actors) {
        const movieActors = movie.actors.split(',').map((a: string) => a.trim());
        actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
      }
      const actorWeight = Math.min(actorMatches / 3, 1);
      score += actorWeight * 0.25;

      // Keyword similarity (10% weight)
      const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
      const keywordWeight = Math.min(keywordMatches / 3, 1);
      score += keywordWeight * 0.10;

      // Language similarity (5% weight)
      if (movie.original_language && languageCounts[movie.original_language]) {
        score += 0.05;
      }

      return { ...movie, similarityScore: score };
    });

    // Sort by similarity and return top matches
    const topMatches = moviesWithScores
      .filter(m => m.similarityScore > 0) // Only return movies with some similarity
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return topMatches.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster || '',
      rating: movie.rating || 0,
      imdbRating: (movie as any).imdb_rating,
      imdbVotes: (movie as any).imdb_votes,
      plot: movie.plot || '',
      imdbId: movie.imdb_id,
      voteCount: movie.vote_count,
      originalLanguage: movie.original_language,
      genre: movie.genres || [],
      actors: movie.actors || '',
      director: movie.director || '',
      runtime: movie.runtime || '',
      writing: movie.writing || '',
      sound: movie.sound || '',
      keywords: movie.keywords || []
    }));
  } catch (error) {
    console.error("Error getting similar movies:", error);
    return [];
  }
}

async function getNextRecommendationForGuest(
  guestRatings: { movieId: string; rating: number }[],
  excludeIds: string[] = []
): Promise<RecommendationMovie | null> {
  try {
    const ratedMovieIds = guestRatings.map(r => r.movieId);
    const allExcludedIds = [...ratedMovieIds, ...excludeIds];
    
    const likedRatings = guestRatings.filter(r => r.rating >= RATING_THRESHOLD);
    
    // If guest has enough ratings, use similarity algorithm
    if (likedRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      const { data: likedMoviesData } = await supabase
        .from('movies')
        .select('genres, director, actors, keywords, original_language')
        .in('id', likedRatings.map(r => r.movieId));
      
      if (!likedMoviesData || likedMoviesData.length === 0) {
        return getFallbackRecommendation(allExcludedIds);
      }

      // Analyze preferences
      const genreCounts: Record<string, number> = {};
      const directorCounts: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};
      const keywordCounts: Record<string, number> = {};
      const languageCounts: Record<string, number> = {};

      likedMoviesData.forEach(movie => {
        (movie.genres || []).forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        
        if (movie.director) {
          directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
        }
        
        if (movie.actors) {
          movie.actors.split(',').forEach((actor: string) => {
            const cleanActor = actor.trim();
            if (cleanActor) {
              actorCounts[cleanActor] = (actorCounts[cleanActor] || 0) + 1;
            }
          });
        }
        
        (movie.keywords || []).forEach((keyword: string) => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
        
        if (movie.original_language) {
          languageCounts[movie.original_language] = (languageCounts[movie.original_language] || 0) + 1;
        }
      });

      // Fetch candidate movies (prioritize IMDb ratings)
      let query = supabase
        .from('movies')
        .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes')
        .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
        .not('rating', 'is', null);

      if (allExcludedIds.length > 0) {
        query = query.not('id', 'in', `(${allExcludedIds.join(',')})`);
      }

      const { data: candidateMovies } = await query.limit(100);

      if (!candidateMovies || candidateMovies.length === 0) {
        return null;
      }

      // Calculate similarity scores
      const moviesWithScores = candidateMovies.map(movie => {
        let score = 0;
        
        const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
        const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
        score += genreWeight * WEIGHTS.GENRE;
        
        if (movie.director && directorCounts[movie.director]) {
          score += WEIGHTS.DIRECTOR;
        }
        
        let actorMatches = 0;
        if (movie.actors) {
          const movieActors = movie.actors.split(',').map((a: string) => a.trim());
          actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
        }
        const actorWeight = Math.min(actorMatches / 3, 1);
        score += actorWeight * WEIGHTS.ACTOR;
        
        const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
        const keywordWeight = Math.min(keywordMatches / 3, 1);
        score += keywordWeight * WEIGHTS.KEYWORD;
        
        if (movie.original_language && languageCounts[movie.original_language]) {
          score += WEIGHTS.LANGUAGE;
        }
        
        const popularityBoost = Math.min((movie.vote_count || 0) / 10000, 0.1);
        score += popularityBoost;
        
        return { ...movie, similarityScore: score };
      });

      const bestMatch = moviesWithScores
        .sort((a, b) => b.similarityScore - a.similarityScore)[0];

      if (!bestMatch) return null;

      return {
        id: bestMatch.id,
        title: bestMatch.title,
        year: bestMatch.year,
        poster: bestMatch.poster || '',
        rating: bestMatch.rating || 0,
        imdbRating: bestMatch.imdb_rating,
        imdbVotes: bestMatch.imdb_votes,
        plot: bestMatch.plot || '',
        imdbId: bestMatch.imdb_id,
        voteCount: bestMatch.vote_count,
        originalLanguage: bestMatch.original_language,
        genre: bestMatch.genres || [],
        actors: bestMatch.actors || '',
        director: bestMatch.director || '',
        runtime: bestMatch.runtime || '',
        writing: bestMatch.writing || '',
        sound: bestMatch.sound || '',
        keywords: bestMatch.keywords || []
      };
    } else {
      return getFallbackRecommendation(allExcludedIds);
    }
  } catch (error) {
    console.error("Error getting guest recommendation:", error);
    return null;
  }
}
