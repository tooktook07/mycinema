import { supabase } from "@/integrations/supabase/client";
import { getRecentlyShownMovieIds, markMoviesAsShown } from "./recentlyShownTracker";

// ============= PHASE 2: TF-IDF CACHING =============
interface GenreIDFCache {
  scores: Record<string, number>;
  timestamp: number;
}

let genreIDFCache: GenreIDFCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============= PHASE 3: USER PREFERENCE CACHING =============
interface UserPreferences {
  genrePreferences: Record<string, number>;
  directorPreferences: Record<string, number>;
  actorPreferences: Record<string, number>;
  keywordPreferences: Record<string, number>;
  languagePreferences: Record<string, number>;
  ratingsHash: string;
  timestamp: number;
}

const userPreferencesCache = new Map<string, UserPreferences>();
const USER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface RecommendationMovie {
  id: string;
  title: string;
  year: number;
  genre: string[];
  poster: string;
  local_poster_url?: string | null;
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
const CANDIDATE_RATING_THRESHOLD = 5.0; // Minimum quality for recommendations (lowered for more candidates)
const MIN_RATINGS_FOR_PERSONALIZATION = 5; // Minimum ratings needed for similarity algorithm

// Rating weight constants (Phase 1)
const RATING_WEIGHTS = {
  LOVE: 3.0, // Rating 10 → 3x weight
  LIKE: 1.0, // Rating 5 → 1x weight
  NOT_INTERESTED: -3.0, // Rating 1 → strong negative signal
};

// Temporal decay multipliers (Phase 3)
const TEMPORAL_DECAY = {
  RECENT: 2.0, // Last 30 days
  MEDIUM: 1.5, // 30-90 days
  OLD: 1.0, // 90+ days
};

// Similarity weights
const WEIGHTS = {
  GENRE: 0.5, // Increased from 0.35 - primary factor
  DIRECTOR: 0.15, // Reduced from 0.20
  ACTOR: 0.15, // Reduced from 0.20
  KEYWORD: 0.1, // Reduced from 0.15
  LANGUAGE: 0.1, // Same
};

// ============= PHASE 2: CACHED TF-IDF CALCULATION =============
async function getGenreIDF(): Promise<Record<string, number>> {
  const now = Date.now();
  
  // Return cached if fresh
  if (genreIDFCache && (now - genreIDFCache.timestamp) < CACHE_TTL) {
    return genreIDFCache.scores;
  }
  
  // Recalculate and cache
  const { data: allMoviesGenres } = await supabase.from("movies").select("genres").not("genres", "is", null);
  
  const totalMovies = allMoviesGenres?.length || 1;
  const genreDocumentCounts: Record<string, number> = {};
  
  allMoviesGenres?.forEach((movie) => {
    const uniqueGenres = new Set(movie.genres || []);
    uniqueGenres.forEach((genre) => {
      genreDocumentCounts[genre] = (genreDocumentCounts[genre] || 0) + 1;
    });
  });
  
  // Calculate IDF scores (rare genres = higher scores)
  const scores: Record<string, number> = {};
  Object.keys(genreDocumentCounts).forEach((genre) => {
    scores[genre] = Math.log(totalMovies / genreDocumentCounts[genre]);
  });
  
  genreIDFCache = { scores, timestamp: now };
  return scores;
}

// ============= PHASE 1: BATCH RECOMMENDATIONS =============
export async function getBatchRecommendations(
  userId: string | null,
  count: number,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number }[],
): Promise<RecommendationMovie[]> {
  // ============= PHASE 1: GUEST USER BATCH OPTIMIZATION =============
  if (!userId && guestRatings) {
    const meaningfulRatings = guestRatings.filter(
      r => r.rating === 1 || r.rating === 5 || r.rating === 10
    );
    
    if (meaningfulRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      // Calculate preferences ONCE
      const weightedRatings = meaningfulRatings.map(rating => ({
        movieId: rating.movieId,
        weight: rating.rating === 10 ? RATING_WEIGHTS.LOVE :
                rating.rating === 5 ? RATING_WEIGHTS.LIKE :
                RATING_WEIGHTS.NOT_INTERESTED
      }));
      
      // Fetch rated movies data ONCE
      const { data: ratedMoviesData } = await supabase
        .from("movies")
        .select("id, genres, director, actors, keywords, original_language")
        .in("id", weightedRatings.map(r => r.movieId));
      
      if (!ratedMoviesData || ratedMoviesData.length === 0) {
        return getFallbackBatchRecommendations(count, excludeIds);
      }
      
      // Build preference profiles ONCE
      const genrePreferences: Record<string, number> = {};
      const directorPreferences: Record<string, number> = {};
      const actorPreferences: Record<string, number> = {};
      const keywordPreferences: Record<string, number> = {};
      const languagePreferences: Record<string, number> = {};
      
      ratedMoviesData.forEach((movie) => {
        const weightData = weightedRatings.find((r) => r.movieId === movie.id);
        if (!weightData) return;
        
        const weight = weightData.weight;
        
        (movie.genres || []).forEach((genre: string) => {
          genrePreferences[genre] = (genrePreferences[genre] || 0) + weight;
        });
        
        if (movie.director) {
          directorPreferences[movie.director] = (directorPreferences[movie.director] || 0) + weight;
        }
        
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            if (cleanActor) {
              actorPreferences[cleanActor] = (actorPreferences[cleanActor] || 0) + weight;
            }
          });
        }
        
        (movie.keywords || []).forEach((keyword: string) => {
          keywordPreferences[keyword] = (keywordPreferences[keyword] || 0) + weight;
        });
        
        if (movie.original_language) {
          languagePreferences[movie.original_language] = (languagePreferences[movie.original_language] || 0) + weight;
        }
      });
      
      // Use CACHED TF-IDF
      const genreIDF = await getGenreIDF();
      
      // Create rating map for penalties
      const ratingMap = new Map<string, number>();
      guestRatings.forEach((r) => {
        ratingMap.set(r.movieId, r.rating);
      });
      
      // Fetch candidates ONCE (larger pool for batch)
      let query = supabase
        .from("movies")
        .select(
          "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url",
        )
        .or(
          `imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`,
        )
        .not("rating", "is", null);
      
      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }
      
      const { data: candidateMovies } = await query.limit(600);
      
      if (!candidateMovies || candidateMovies.length === 0) {
        return getFallbackBatchRecommendations(count, excludeIds);
      }
      
      // Calculate max weights for normalization
      const maxGenreWeight = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
      const maxDirectorWeight = Math.max(...Object.values(directorPreferences).map(Math.abs), 1);
      const maxActorWeight = Math.max(...Object.values(actorPreferences).map(Math.abs), 1);
      const maxKeywordWeight = Math.max(...Object.values(keywordPreferences).map(Math.abs), 1);
      const maxLangWeight = Math.max(...Object.values(languagePreferences).map(Math.abs), 1);
      
      // Score all candidates ONCE
      const moviesWithScores = candidateMovies.map((movie) => {
        let score = 0;
        
        // TF-IDF Genre scoring
        let genreScore = 0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            const tf = preference;
            const idf = genreIDF[genre] || 0;
            genreScore += tf * idf;
          }
        });
        const normalizedGenreScore = maxGenreWeight > 0 ? genreScore / maxGenreWeight : 0;
        score += normalizedGenreScore * WEIGHTS.GENRE;
        
        // Director scoring
        if (movie.director && directorPreferences[movie.director]) {
          const directorWeight = directorPreferences[movie.director];
          score += (directorWeight / maxDirectorWeight) * WEIGHTS.DIRECTOR;
        }
        
        // Actor scoring
        let actorScore = 0;
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            const preference = actorPreferences[cleanActor];
            if (preference) {
              actorScore += preference;
            }
          });
        }
        if (maxActorWeight > 0) {
          score += (actorScore / maxActorWeight) * WEIGHTS.ACTOR;
        }
        
        // Keyword scoring
        let keywordScore = 0;
        (movie.keywords || []).forEach((keyword: string) => {
          const preference = keywordPreferences[keyword];
          if (preference) {
            keywordScore += preference;
          }
        });
        if (maxKeywordWeight > 0) {
          score += (keywordScore / maxKeywordWeight) * WEIGHTS.KEYWORD;
        }
        
        // Language scoring
        if (movie.original_language && languagePreferences[movie.original_language]) {
          const langWeight = languagePreferences[movie.original_language];
          score += (langWeight / maxLangWeight) * WEIGHTS.LANGUAGE;
        }
        
        const popularityBoost = Math.min((movie.vote_count || 0) / 10000, 0.1);
        score += popularityBoost;
        
        // Apply penalty system
        let penaltyMultiplier = 1.0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            if (preference <= -4.0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
            } else if (preference <= -2.0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.5);
            } else if (preference < 0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.7);
            }
          }
        });
        
        if (ratingMap.has(movie.id)) {
          const userRating = ratingMap.get(movie.id);
          if (userRating === 10) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
          } else if (userRating === 5) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.4);
          } else if (userRating === 1) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.15);
          }
        }
        
        score *= penaltyMultiplier;
        
        return { ...movie, similarityScore: score };
      });
      
      // Get top matches
      const topMatches = moviesWithScores
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, Math.min(count * 2, 40));
      
      if (!topMatches || topMatches.length === 0) {
        return getFallbackBatchRecommendations(count, excludeIds);
      }
      
      // Randomly select from top matches
      const results: RecommendationMovie[] = [];
      const selectedIds = new Set<string>();
      
      while (results.length < count && topMatches.length > 0) {
        const randomIndex = Math.floor(Math.random() * topMatches.length);
        const selected = topMatches.splice(randomIndex, 1)[0];
        
        if (!selectedIds.has(selected.id)) {
          selectedIds.add(selected.id);
          results.push({
            id: selected.id,
            title: selected.title,
            year: selected.year,
            poster: selected.poster || "",
            local_poster_url: selected.local_poster_url,
            rating: selected.rating || 0,
            imdbRating: selected.imdb_rating,
            imdbVotes: selected.imdb_votes,
            plot: selected.plot || "",
            imdbId: selected.imdb_id,
            voteCount: selected.vote_count,
            originalLanguage: selected.original_language,
            genre: selected.genres || [],
            actors: selected.actors || "",
            director: selected.director || "",
            runtime: selected.runtime || "",
            writing: selected.writing || "",
            sound: selected.sound || "",
            keywords: selected.keywords || [],
          });
        }
      }
      
      markMoviesAsShown(results.map(r => r.id));
      return results;
    } else {
      // Guest without enough ratings - use fallback
      return getFallbackBatchRecommendations(count, excludeIds);
    }
  }

  // ============= PHASE 2: FALLBACK BATCH OPTIMIZATION =============
  if (!userId) {
    return getFallbackBatchRecommendations(count, excludeIds);
  }

  try {
    // Get recently shown movies to exclude
    const recentlyShownIds = getRecentlyShownMovieIds();
    const allExcludedIds = [...excludeIds, ...recentlyShownIds];

    // Fetch user's rated movies WITH timestamps AND watchlist status
    const { data: userRatings } = await supabase
      .from("user_ratings")
      .select("media_id, user_rating, in_watchlist, created_at")
      .eq("user_id", userId)
      .eq("media_type", "movie");

    // Create maps for quick lookup during scoring
    const ratingMap = new Map<string, number>();
    const watchlistSet = new Set<string>();

    (userRatings || []).forEach((r) => {
      if (r.user_rating) {
        ratingMap.set(r.media_id, r.user_rating);
      }
      if (r.in_watchlist) {
        watchlistSet.add(r.media_id);
      }
    });

    // Filter ratings that matter
    const meaningfulRatings = (userRatings || []).filter(
      (r) => r.user_rating && (r.user_rating === 1 || r.user_rating === 5 || r.user_rating === 10),
    );

    // If user has enough ratings, use similarity algorithm
    if (meaningfulRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      // Check cache for user preferences
      const ratingsHash = meaningfulRatings.map(r => `${r.media_id}-${r.user_rating}`).join('|');
      const cachedPrefs = userPreferencesCache.get(userId);
      
      let genrePreferences: Record<string, number>;
      let directorPreferences: Record<string, number>;
      let actorPreferences: Record<string, number>;
      let keywordPreferences: Record<string, number>;
      let languagePreferences: Record<string, number>;

      if (cachedPrefs && cachedPrefs.ratingsHash === ratingsHash && (Date.now() - cachedPrefs.timestamp) < USER_CACHE_TTL) {
        // Use cached preferences
        genrePreferences = cachedPrefs.genrePreferences;
        directorPreferences = cachedPrefs.directorPreferences;
        actorPreferences = cachedPrefs.actorPreferences;
        keywordPreferences = cachedPrefs.keywordPreferences;
        languagePreferences = cachedPrefs.languagePreferences;
      } else {
        // Calculate weighted preferences with temporal decay
        const weightedRatings = meaningfulRatings.map((rating) => {
          let baseWeight = 0;
          if (rating.user_rating === 10) {
            baseWeight = RATING_WEIGHTS.LOVE;
          } else if (rating.user_rating === 5) {
            baseWeight = RATING_WEIGHTS.LIKE;
          } else if (rating.user_rating === 1) {
            baseWeight = RATING_WEIGHTS.NOT_INTERESTED;
          }

          const ageInDays = (Date.now() - new Date(rating.created_at).getTime()) / (1000 * 60 * 60 * 24);
          let temporalMultiplier = TEMPORAL_DECAY.OLD;
          if (ageInDays < 30) {
            temporalMultiplier = TEMPORAL_DECAY.RECENT;
          } else if (ageInDays < 90) {
            temporalMultiplier = TEMPORAL_DECAY.MEDIUM;
          }

          return {
            media_id: rating.media_id,
            weight: baseWeight * temporalMultiplier,
          };
        });

        // Fetch rated movies data
        const { data: ratedMoviesData } = await supabase
          .from("movies")
          .select("id, genres, director, actors, keywords, original_language")
          .in(
            "id",
            weightedRatings.map((r) => r.media_id),
          );

        if (!ratedMoviesData || ratedMoviesData.length === 0) {
          return getFallbackBatchRecommendations(count, allExcludedIds);
        }

        // Build weighted preference profiles
        genrePreferences = {};
        directorPreferences = {};
        actorPreferences = {};
        keywordPreferences = {};
        languagePreferences = {};

        ratedMoviesData.forEach((movie) => {
          const weightData = weightedRatings.find((r) => r.media_id === movie.id);
          if (!weightData) return;

          const weight = weightData.weight;

          (movie.genres || []).forEach((genre: string) => {
            genrePreferences[genre] = (genrePreferences[genre] || 0) + weight;
          });

          if (movie.director) {
            directorPreferences[movie.director] = (directorPreferences[movie.director] || 0) + weight;
          }

          if (movie.actors) {
            movie.actors.split(",").forEach((actor: string) => {
              const cleanActor = actor.trim();
              if (cleanActor) {
                actorPreferences[cleanActor] = (actorPreferences[cleanActor] || 0) + weight;
              }
            });
          }

          (movie.keywords || []).forEach((keyword: string) => {
            keywordPreferences[keyword] = (keywordPreferences[keyword] || 0) + weight;
          });

          if (movie.original_language) {
            languagePreferences[movie.original_language] = (languagePreferences[movie.original_language] || 0) + weight;
          }
        });

        // Cache the preferences
        userPreferencesCache.set(userId, {
          genrePreferences,
          directorPreferences,
          actorPreferences,
          keywordPreferences,
          languagePreferences,
          ratingsHash,
          timestamp: Date.now(),
        });
      }

      // Get cached TF-IDF scores
      const genreIDF = await getGenreIDF();

      // Fetch candidate movies (larger pool for batch)
      let query = supabase
        .from("movies")
        .select(
          "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url",
        )
        .or(
          `imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`,
        )
        .not("rating", "is", null);

      if (allExcludedIds.length > 0) {
        query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
      }

      const { data: candidateMovies } = await query.limit(800); // Larger pool for batch

      if (!candidateMovies || candidateMovies.length === 0) {
        return [];
      }

      // Calculate max weights for normalization
      const maxGenreWeight = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
      const maxDirectorWeight = Math.max(...Object.values(directorPreferences).map(Math.abs), 1);
      const maxActorWeight = Math.max(...Object.values(actorPreferences).map(Math.abs), 1);
      const maxKeywordWeight = Math.max(...Object.values(keywordPreferences).map(Math.abs), 1);
      const maxLangWeight = Math.max(...Object.values(languagePreferences).map(Math.abs), 1);

      // Calculate similarity scores for all candidates
      const moviesWithScores = candidateMovies.map((movie) => {
        let score = 0;

        const effectiveRating = movie.imdb_rating || movie.rating;
        const effectiveVotes = movie.imdb_votes || movie.vote_count;

        if (movie.imdb_rating) {
          score += 0.5;
        }

        if (movie.imdb_rating >= 7 && (movie.vote_count || 0) < 5000) {
          score += 2.0;
        }

        // TF-IDF Genre scoring
        let genreScore = 0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            const tf = preference;
            const idf = genreIDF[genre] || 0;
            genreScore += tf * idf;
          }
        });
        const normalizedGenreScore = maxGenreWeight > 0 ? genreScore / maxGenreWeight : 0;
        score += normalizedGenreScore * WEIGHTS.GENRE;

        // Director scoring
        if (movie.director && directorPreferences[movie.director]) {
          const directorWeight = directorPreferences[movie.director];
          score += (directorWeight / maxDirectorWeight) * WEIGHTS.DIRECTOR;
        }

        // Actor scoring
        let actorScore = 0;
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            const preference = actorPreferences[cleanActor];
            if (preference) {
              actorScore += preference;
            }
          });
        }
        if (maxActorWeight > 0) {
          score += (actorScore / maxActorWeight) * WEIGHTS.ACTOR;
        }

        // Keyword scoring
        let keywordScore = 0;
        (movie.keywords || []).forEach((keyword: string) => {
          const preference = keywordPreferences[keyword];
          if (preference) {
            keywordScore += preference;
          }
        });
        if (maxKeywordWeight > 0) {
          score += (keywordScore / maxKeywordWeight) * WEIGHTS.KEYWORD;
        }

        // Language scoring
        if (movie.original_language && languagePreferences[movie.original_language]) {
          const langWeight = languagePreferences[movie.original_language];
          score += (langWeight / maxLangWeight) * WEIGHTS.LANGUAGE;
        }

        const popularityBoost = Math.min((effectiveVotes || 0) / 10000, 0.1);
        score += popularityBoost;

        // Penalty system
        let penaltyMultiplier = 1.0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            if (preference <= -4.0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
            } else if (preference <= -2.0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.5);
            } else if (preference < 0) {
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.7);
            }
          }
        });

        if (watchlistSet.has(movie.id)) {
          penaltyMultiplier = Math.min(penaltyMultiplier, 0.4);
        }

        if (ratingMap.has(movie.id)) {
          const userRating = ratingMap.get(movie.id);
          if (userRating === 10) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
          } else if (userRating === 5) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.4);
          } else if (userRating === 1) {
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.15);
          }
        }

        score *= penaltyMultiplier;

        return { ...movie, similarityScore: score };
      });

      // Get top matches
      const topMatches = moviesWithScores
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, Math.min(count * 2, 40)); // Get 2x count or max 40 for variety

      if (!topMatches || topMatches.length === 0) return [];

      // Randomly select from top matches for variety
      const results: RecommendationMovie[] = [];
      const selectedIds = new Set<string>();
      
      while (results.length < count && topMatches.length > 0) {
        const randomIndex = Math.floor(Math.random() * topMatches.length);
        const selected = topMatches.splice(randomIndex, 1)[0];
        
        if (!selectedIds.has(selected.id)) {
          selectedIds.add(selected.id);
          results.push({
            id: selected.id,
            title: selected.title,
            year: selected.year,
            poster: selected.poster || "",
            local_poster_url: selected.local_poster_url,
            rating: selected.rating || 0,
            imdbRating: selected.imdb_rating,
            imdbVotes: selected.imdb_votes,
            plot: selected.plot || "",
            imdbId: selected.imdb_id,
            voteCount: selected.vote_count,
            originalLanguage: selected.original_language,
            genre: selected.genres || [],
            actors: selected.actors || "",
            director: selected.director || "",
            runtime: selected.runtime || "",
            writing: selected.writing || "",
            sound: selected.sound || "",
            keywords: selected.keywords || [],
          });
        }
      }

      // Mark all as shown
      markMoviesAsShown(results.map(r => r.id));

      return results;
    } else {
      // Fallback for users with few ratings
      return getFallbackBatchRecommendations(count, allExcludedIds);
    }
  } catch (error) {
    console.error("Error getting batch recommendations:", error);
    return [];
  }
}

export async function getNextRecommendation(
  userId: string | null,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number }[],
): Promise<RecommendationMovie | null> {
  // If guest user, use guest-specific recommendation
  if (!userId && guestRatings) {
    return getNextRecommendationForGuest(guestRatings, excludeIds);
  }

  if (!userId) {
    return getFallbackRecommendation(excludeIds);
  }
  try {
    // Get recently shown movies to exclude
    const recentlyShownIds = getRecentlyShownMovieIds();

    // Phase 1 & 3: Fetch user's rated movies WITH timestamps AND watchlist status
    const { data: userRatings } = await supabase
      .from("user_ratings")
      .select("media_id, user_rating, in_watchlist, created_at")
      .eq("user_id", userId)
      .eq("media_type", "movie");

    // Create maps for quick lookup during scoring
    const ratingMap = new Map<string, number>();
    const watchlistSet = new Set<string>();

    (userRatings || []).forEach((r) => {
      if (r.user_rating) {
        ratingMap.set(r.media_id, r.user_rating);
      }
      if (r.in_watchlist) {
        watchlistSet.add(r.media_id);
      }
    });

    // Only exclude from already excluded and recently shown (not rated movies)
    const allExcludedIds = [...excludeIds, ...recentlyShownIds];

    // Filter ratings that matter (likes and dislikes, exclude neutral)
    const meaningfulRatings = (userRatings || []).filter(
      (r) => r.user_rating && (r.user_rating === 1 || r.user_rating === 5 || r.user_rating === 10),
    );

    // If user has enough ratings, use similarity algorithm
    if (meaningfulRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      // Phase 1: Calculate weighted preferences with temporal decay
      interface WeightedRating {
        media_id: string;
        weight: number;
      }

      const weightedRatings: WeightedRating[] = meaningfulRatings.map((rating) => {
        // Phase 1: Rating-based weight
        let baseWeight = 0;
        if (rating.user_rating === 10) {
          baseWeight = RATING_WEIGHTS.LOVE;
        } else if (rating.user_rating === 5) {
          baseWeight = RATING_WEIGHTS.LIKE;
        } else if (rating.user_rating === 1) {
          baseWeight = RATING_WEIGHTS.NOT_INTERESTED;
        }

        // Phase 3: Temporal decay
        const ageInDays = (Date.now() - new Date(rating.created_at).getTime()) / (1000 * 60 * 60 * 24);
        let temporalMultiplier = TEMPORAL_DECAY.OLD;
        if (ageInDays < 30) {
          temporalMultiplier = TEMPORAL_DECAY.RECENT;
        } else if (ageInDays < 90) {
          temporalMultiplier = TEMPORAL_DECAY.MEDIUM;
        }

        return {
          media_id: rating.media_id,
          weight: baseWeight * temporalMultiplier,
        };
      });

      // Fetch ALL rated movies data (including dislikes for negative signals)
      const { data: ratedMoviesData } = await supabase
        .from("movies")
        .select("id, genres, director, actors, keywords, original_language")
        .in(
          "id",
          weightedRatings.map((r) => r.media_id),
        );

      if (!ratedMoviesData || ratedMoviesData.length === 0) {
        return getFallbackRecommendation(allExcludedIds);
      }

      // Phase 1: Build weighted preference profiles
      const genrePreferences: Record<string, number> = {};
      const directorPreferences: Record<string, number> = {};
      const actorPreferences: Record<string, number> = {};
      const keywordPreferences: Record<string, number> = {};
      const languagePreferences: Record<string, number> = {};

      ratedMoviesData.forEach((movie) => {
        const weightData = weightedRatings.find((r) => r.media_id === movie.id);
        if (!weightData) return;

        const weight = weightData.weight;

        // Weighted genre preferences
        (movie.genres || []).forEach((genre: string) => {
          genrePreferences[genre] = (genrePreferences[genre] || 0) + weight;
        });

        // Weighted director preferences
        if (movie.director) {
          directorPreferences[movie.director] = (directorPreferences[movie.director] || 0) + weight;
        }

        // Weighted actor preferences
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            if (cleanActor) {
              actorPreferences[cleanActor] = (actorPreferences[cleanActor] || 0) + weight;
            }
          });
        }

        // Weighted keyword preferences
        (movie.keywords || []).forEach((keyword: string) => {
          keywordPreferences[keyword] = (keywordPreferences[keyword] || 0) + weight;
        });

        // Weighted language preferences
        if (movie.original_language) {
          languagePreferences[movie.original_language] = (languagePreferences[movie.original_language] || 0) + weight;
        }
      });

      // Phase 2: Use cached TF-IDF for genres
      const genreIDF = await getGenreIDF();

      // Fetch candidate movies (prioritize IMDb ratings)
      let query = supabase
        .from("movies")
        .select(
          "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
        )
        .or(
          `imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`,
        )
        .not("rating", "is", null);

      if (allExcludedIds.length > 0) {
        query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
      }

      const { data: candidateMovies } = await query.limit(500); // Increased for more variety

      if (!candidateMovies || candidateMovies.length === 0) {
        return null;
      }

      // Calculate max weights for normalization (include negatives)
      const maxGenreWeight = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
      const maxDirectorWeight = Math.max(...Object.values(directorPreferences).map(Math.abs), 1);
      const maxActorWeight = Math.max(...Object.values(actorPreferences).map(Math.abs), 1);
      const maxKeywordWeight = Math.max(...Object.values(keywordPreferences).map(Math.abs), 1);
      const maxLangWeight = Math.max(...Object.values(languagePreferences).map(Math.abs), 1);

      // Calculate similarity scores with weighted preferences
      const moviesWithScores = candidateMovies.map((movie) => {
        let score = 0;

        // Use IMDB rating if available, otherwise TMDB rating
        const effectiveRating = movie.imdb_rating || movie.rating;
        const effectiveVotes = movie.imdb_votes || movie.vote_count;

        // Boost score for IMDB-verified movies
        if (movie.imdb_rating) {
          score += 0.5;
        }

        // Hidden gems detection
        if (movie.imdb_rating >= 7 && (movie.vote_count || 0) < 5000) {
          score += 2.0;
        }

        // Phase 2: TF-IDF Genre scoring (now includes negative preferences)
        let genreScore = 0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            const tf = preference;
            const idf = genreIDF[genre] || 0;
            genreScore += tf * idf;
          }
        });
        const normalizedGenreScore = maxGenreWeight > 0 ? genreScore / maxGenreWeight : 0;
        score += normalizedGenreScore * WEIGHTS.GENRE;

        // Weighted director scoring (now includes negative preferences)
        if (movie.director && directorPreferences[movie.director]) {
          const directorWeight = directorPreferences[movie.director];
          score += (directorWeight / maxDirectorWeight) * WEIGHTS.DIRECTOR;
        }

        // Weighted actor scoring (now includes negative preferences)
        let actorScore = 0;
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            const preference = actorPreferences[cleanActor];
            if (preference) {
              actorScore += preference;
            }
          });
        }
        if (maxActorWeight > 0) {
          score += (actorScore / maxActorWeight) * WEIGHTS.ACTOR;
        }

        // Weighted keyword scoring (now includes negative preferences)
        let keywordScore = 0;
        (movie.keywords || []).forEach((keyword: string) => {
          const preference = keywordPreferences[keyword];
          if (preference) {
            keywordScore += preference;
          }
        });
        if (maxKeywordWeight > 0) {
          score += (keywordScore / maxKeywordWeight) * WEIGHTS.KEYWORD;
        }

        // Weighted language scoring (now includes negative preferences)
        if (movie.original_language && languagePreferences[movie.original_language]) {
          const langWeight = languagePreferences[movie.original_language];
          score += (langWeight / maxLangWeight) * WEIGHTS.LANGUAGE;
        }

        // Slight boost for popularity
        const popularityBoost = Math.min((effectiveVotes || 0) / 10000, 0.1);
        score += popularityBoost;

        // Phase 3: Apply graduated penalty system for disliked genres
        let penaltyMultiplier = 1.0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            if (preference <= -4.0) {
              // 3+ dislikes: 80% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
            } else if (preference <= -2.0) {
              // 1-2 dislikes: 50% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.5);
            } else if (preference < 0) {
              // Any negative preference: 30% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.7);
            }
          }
        });

        // Apply watchlist penalty (movies user wants to watch but may/may not have rated)
        if (watchlistSet.has(movie.id)) {
          penaltyMultiplier = Math.min(penaltyMultiplier, 0.4); // 60% reduction
        }

        // Apply already-rated penalty (strongest penalty)
        if (ratingMap.has(movie.id)) {
          const userRating = ratingMap.get(movie.id);

          if (userRating === 10) {
            // LOVE: reduce by 80% (user already loved this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
          } else if (userRating === 5) {
            // LIKE: reduce by 60% (user already liked this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.4);
          } else if (userRating === 1) {
            // NOT_INTERESTED: reduce by 85% (user disliked this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.15);
          }
        }

        score *= penaltyMultiplier;

        return { ...movie, similarityScore: score };
      });

      // Select randomly from top matches for variety
      const TOP_MATCHES_FOR_DISCOVER = 20;
      const topMatches = moviesWithScores
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, TOP_MATCHES_FOR_DISCOVER);

      if (!topMatches || topMatches.length === 0) return null;

      // Randomly select one from top matches
      const randomIndex = Math.floor(Math.random() * topMatches.length);
      const bestMatch = topMatches[randomIndex];

      // Mark this recommendation as shown
      markMoviesAsShown([bestMatch.id]);

      return {
        id: bestMatch.id,
        title: bestMatch.title,
        year: bestMatch.year,
        poster: bestMatch.poster || "",
        rating: bestMatch.rating || 0,
        imdbRating: bestMatch.imdb_rating,
        imdbVotes: bestMatch.imdb_votes,
        plot: bestMatch.plot || "",
        imdbId: bestMatch.imdb_id,
        voteCount: bestMatch.vote_count,
        originalLanguage: bestMatch.original_language,
        genre: bestMatch.genres || [],
        actors: bestMatch.actors || "",
        director: bestMatch.director || "",
        runtime: bestMatch.runtime || "",
        writing: bestMatch.writing || "",
        sound: bestMatch.sound || "",
        keywords: bestMatch.keywords || [],
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

// ============= PHASE 2: FALLBACK BATCH RECOMMENDATIONS =============
async function getFallbackBatchRecommendations(count: number, excludeIds: string[]): Promise<RecommendationMovie[]> {
  // Get recently shown movies to exclude
  const recentlyShownIds = getRecentlyShownMovieIds();
  const allExcludedIds = [...excludeIds, ...recentlyShownIds];

  // Fetch larger pool ONCE
  let query = supabase
    .from("movies")
    .select(
      "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url",
    )
    .or(`imdb_rating.gte.7.0,and(imdb_rating.is.null,rating.gte.7.0)`)
    .not("rating", "is", null)
    .order("imdb_rating", { ascending: false, nullsFirst: false })
    .order("vote_count", { ascending: false });

  if (allExcludedIds.length > 0) {
    query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
  }

  const { data: movies } = await query.limit(Math.min(count * 5, 100));

  if (!movies || movies.length === 0) return [];

  // Shuffle and return requested count
  const shuffled = [...movies].sort(() => Math.random() - 0.5);
  const selectedMovies = shuffled.slice(0, count);
  
  // Mark as shown
  markMoviesAsShown(selectedMovies.map(m => m.id));
  
  // Map to recommendation format
  return selectedMovies.map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || "",
    local_poster_url: movie.local_poster_url,
    rating: movie.rating || 0,
    imdbRating: movie.imdb_rating,
    imdbVotes: movie.imdb_votes,
    plot: movie.plot || "",
    imdbId: movie.imdb_id,
    voteCount: movie.vote_count,
    originalLanguage: movie.original_language,
    genre: movie.genres || [],
    actors: movie.actors || "",
    director: movie.director || "",
    runtime: movie.runtime || "",
    writing: movie.writing || "",
    sound: movie.sound || "",
    keywords: movie.keywords || [],
  }));
}

async function getFallbackRecommendation(excludeIds: string[]): Promise<RecommendationMovie | null> {
  // Get recently shown movies to exclude
  const recentlyShownIds = getRecentlyShownMovieIds();
  const allExcludedIds = [...excludeIds, ...recentlyShownIds];

  // Tier 1: Try high-rated movies (7.0+) excluding recently shown
  let query = supabase
    .from("movies")
    .select(
      "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
    )
    .or(`imdb_rating.gte.7.0,and(imdb_rating.is.null,rating.gte.7.0)`)
    .not("rating", "is", null);

  // Prefer IMDb-verified movies for new users
  query = query.order("imdb_rating", { ascending: false, nullsFirst: false });
  query = query.order("vote_count", { ascending: false });

  if (allExcludedIds.length > 0) {
    query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
  }

  let { data: movies } = await query.limit(50);

  // Tier 2: If no high-rated movies, try all movies with any rating (excluding recently shown)
  if (!movies || movies.length === 0) {
    query = supabase
      .from("movies")
      .select(
        "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
      )
      .not("rating", "is", null)
      .order("imdb_rating", { ascending: false, nullsFirst: false })
      .order("vote_count", { ascending: false });

    if (allExcludedIds.length > 0) {
      query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
    }

    const result = await query.limit(50);
    movies = result.data;
  }

  // Tier 3: If still nothing, ignore recently shown (only exclude explicitly passed excludeIds)
  if (!movies || movies.length === 0) {
    query = supabase
      .from("movies")
      .select(
        "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
      )
      .not("rating", "is", null)
      .order("imdb_rating", { ascending: false, nullsFirst: false })
      .order("vote_count", { ascending: false });

    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const result = await query.limit(50);
    movies = result.data;
  }

  if (!movies || movies.length === 0) return null;

  // Randomly select from available movies
  const randomIndex = Math.floor(Math.random() * movies.length);
  const movie = movies[randomIndex];

  // Mark this recommendation as shown
  markMoviesAsShown([movie.id]);

  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || "",
    rating: movie.rating || 0,
    imdbRating: movie.imdb_rating,
    imdbVotes: movie.imdb_votes,
    plot: movie.plot || "",
    imdbId: movie.imdb_id,
    voteCount: movie.vote_count,
    originalLanguage: movie.original_language,
    genre: movie.genres || [],
    actors: movie.actors || "",
    director: movie.director || "",
    runtime: movie.runtime || "",
    writing: movie.writing || "",
    sound: movie.sound || "",
    keywords: movie.keywords || [],
  };
}

export async function getSimilarMovies(movieId: string, limit: number = 6): Promise<RecommendationMovie[]> {
  try {
    // Get the reference movie
    const { data: referenceMovie } = await supabase
      .from("movies")
      .select("genres, director, actors, keywords, original_language")
      .eq("id", movieId)
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
      referenceMovie.actors.split(",").forEach((actor: string) => {
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
      .from("movies")
      .select(
        "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
      )
      .or(
        `imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`,
      )
      .not("rating", "is", null)
      .neq("id", movieId)
      .limit(200);

    if (!candidateMovies || candidateMovies.length === 0) return [];

    // Calculate similarity scores (using same weights as main algorithm)
    const moviesWithScores = candidateMovies.map((movie) => {
      let score = 0;

      // Genre similarity (40% weight)
      const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
      const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
      score += genreWeight * 0.4;

      // Director similarity (20% weight)
      if (movie.director && directorCounts[movie.director]) {
        score += 0.2;
      }

      // Actor similarity (25% weight)
      let actorMatches = 0;
      if (movie.actors) {
        const movieActors = movie.actors.split(",").map((a: string) => a.trim());
        actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
      }
      const actorWeight = Math.min(actorMatches / 3, 1);
      score += actorWeight * 0.25;

      // Keyword similarity (10% weight)
      const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
      const keywordWeight = Math.min(keywordMatches / 3, 1);
      score += keywordWeight * 0.1;

      // Language similarity (5% weight)
      if (movie.original_language && languageCounts[movie.original_language]) {
        score += 0.05;
      }

      return { ...movie, similarityScore: score };
    });

    // Sort by similarity and return top matches
    const topMatches = moviesWithScores
      .filter((m) => m.similarityScore > 0) // Only return movies with some similarity
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return topMatches.map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster || "",
      rating: movie.rating || 0,
      imdbRating: (movie as any).imdb_rating,
      imdbVotes: (movie as any).imdb_votes,
      plot: movie.plot || "",
      imdbId: movie.imdb_id,
      voteCount: movie.vote_count,
      originalLanguage: movie.original_language,
      genre: movie.genres || [],
      actors: movie.actors || "",
      director: movie.director || "",
      runtime: movie.runtime || "",
      writing: movie.writing || "",
      sound: movie.sound || "",
      keywords: movie.keywords || [],
    }));
  } catch (error) {
    console.error("Error getting similar movies:", error);
    return [];
  }
}

async function getNextRecommendationForGuest(
  guestRatings: { movieId: string; rating: number; createdAt?: Date }[],
  excludeIds: string[] = [],
): Promise<RecommendationMovie | null> {
  try {
    // Create rating map for quick lookup
    const ratingMap = new Map<string, number>();
    guestRatings.forEach((r) => {
      ratingMap.set(r.movieId, r.rating);
    });

    // Only exclude explicitly excluded movies (not rated movies - they get penalties instead)
    const allExcludedIds = [...excludeIds];

    // Filter meaningful ratings (likes and dislikes)
    const meaningfulRatings = guestRatings.filter((r) => r.rating === 1 || r.rating === 5 || r.rating === 10);

    // If guest has enough ratings, use similarity algorithm
    if (meaningfulRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
      // Phase 1: Calculate weighted preferences (guest ratings don't have timestamps, so no temporal decay)
      interface WeightedRating {
        movieId: string;
        weight: number;
      }

      const weightedRatings: WeightedRating[] = meaningfulRatings.map((rating) => {
        let weight = 0;
        if (rating.rating === 10) {
          weight = RATING_WEIGHTS.LOVE;
        } else if (rating.rating === 5) {
          weight = RATING_WEIGHTS.LIKE;
        } else if (rating.rating === 1) {
          weight = RATING_WEIGHTS.NOT_INTERESTED;
        }

        return { movieId: rating.movieId, weight };
      });

      const { data: ratedMoviesData } = await supabase
        .from("movies")
        .select("id, genres, director, actors, keywords, original_language")
        .in(
          "id",
          weightedRatings.map((r) => r.movieId),
        );

      if (!ratedMoviesData || ratedMoviesData.length === 0) {
        return getFallbackRecommendation(allExcludedIds);
      }

      // Build weighted preference profiles
      const genrePreferences: Record<string, number> = {};
      const directorPreferences: Record<string, number> = {};
      const actorPreferences: Record<string, number> = {};
      const keywordPreferences: Record<string, number> = {};
      const languagePreferences: Record<string, number> = {};

      ratedMoviesData.forEach((movie) => {
        const weightData = weightedRatings.find((r) => r.movieId === movie.id);
        if (!weightData) return;

        const weight = weightData.weight;

        (movie.genres || []).forEach((genre: string) => {
          genrePreferences[genre] = (genrePreferences[genre] || 0) + weight;
        });

        if (movie.director) {
          directorPreferences[movie.director] = (directorPreferences[movie.director] || 0) + weight;
        }

        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            if (cleanActor) {
              actorPreferences[cleanActor] = (actorPreferences[cleanActor] || 0) + weight;
            }
          });
        }

        (movie.keywords || []).forEach((keyword: string) => {
          keywordPreferences[keyword] = (keywordPreferences[keyword] || 0) + weight;
        });

        if (movie.original_language) {
          languagePreferences[movie.original_language] = (languagePreferences[movie.original_language] || 0) + weight;
        }
      });

      // Use CACHED TF-IDF
      const genreIDF = await getGenreIDF();

      // Fetch candidate movies (prioritize IMDb ratings)
      let query = supabase
        .from("movies")
        .select(
          "id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes",
        )
        .or(
          `imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`,
        )
        .not("rating", "is", null);

      if (allExcludedIds.length > 0) {
        query = query.not("id", "in", `(${allExcludedIds.join(",")})`);
      }

      const { data: candidateMovies } = await query.limit(200);

      if (!candidateMovies || candidateMovies.length === 0) {
        return null;
      }

      // Calculate max weights for normalization (include negatives)
      const maxGenreWeight = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
      const maxDirectorWeight = Math.max(...Object.values(directorPreferences).map(Math.abs), 1);
      const maxActorWeight = Math.max(...Object.values(actorPreferences).map(Math.abs), 1);
      const maxKeywordWeight = Math.max(...Object.values(keywordPreferences).map(Math.abs), 1);
      const maxLangWeight = Math.max(...Object.values(languagePreferences).map(Math.abs), 1);

      // Calculate similarity scores with weighted preferences
      const moviesWithScores = candidateMovies.map((movie) => {
        let score = 0;

        // TF-IDF Genre scoring (now includes negative preferences)
        let genreScore = 0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            const tf = preference;
            const idf = genreIDF[genre] || 0;
            genreScore += tf * idf;
          }
        });
        const normalizedGenreScore = maxGenreWeight > 0 ? genreScore / maxGenreWeight : 0;
        score += normalizedGenreScore * WEIGHTS.GENRE;

        // Weighted director scoring (now includes negative preferences)
        if (movie.director && directorPreferences[movie.director]) {
          const directorWeight = directorPreferences[movie.director];
          score += (directorWeight / maxDirectorWeight) * WEIGHTS.DIRECTOR;
        }

        // Weighted actor scoring (now includes negative preferences)
        let actorScore = 0;
        if (movie.actors) {
          movie.actors.split(",").forEach((actor: string) => {
            const cleanActor = actor.trim();
            const preference = actorPreferences[cleanActor];
            if (preference) {
              actorScore += preference;
            }
          });
        }
        if (maxActorWeight > 0) {
          score += (actorScore / maxActorWeight) * WEIGHTS.ACTOR;
        }

        // Weighted keyword scoring (now includes negative preferences)
        let keywordScore = 0;
        (movie.keywords || []).forEach((keyword: string) => {
          const preference = keywordPreferences[keyword];
          if (preference) {
            keywordScore += preference;
          }
        });
        if (maxKeywordWeight > 0) {
          score += (keywordScore / maxKeywordWeight) * WEIGHTS.KEYWORD;
        }

        // Weighted language scoring (now includes negative preferences)
        if (movie.original_language && languagePreferences[movie.original_language]) {
          const langWeight = languagePreferences[movie.original_language];
          score += (langWeight / maxLangWeight) * WEIGHTS.LANGUAGE;
        }

        const popularityBoost = Math.min((movie.vote_count || 0) / 10000, 0.1);
        score += popularityBoost;

        // Apply graduated penalty system for disliked genres
        let penaltyMultiplier = 1.0;
        (movie.genres || []).forEach((genre: string) => {
          const preference = genrePreferences[genre];
          if (preference) {
            if (preference <= -4.0) {
              // 3+ dislikes: 80% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
            } else if (preference <= -2.0) {
              // 1-2 dislikes: 50% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.5);
            } else if (preference < 0) {
              // Any negative preference: 30% penalty
              penaltyMultiplier = Math.min(penaltyMultiplier, 0.7);
            }
          }
        });

        // Apply already-rated penalty for guest users
        if (ratingMap.has(movie.id)) {
          const userRating = ratingMap.get(movie.id);

          if (userRating === 10) {
            // LOVE: reduce by 80% (user already loved this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.2);
          } else if (userRating === 5) {
            // LIKE: reduce by 60% (user already liked this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.4);
          } else if (userRating === 1) {
            // NOT_INTERESTED: reduce by 85% (user disliked this)
            penaltyMultiplier = Math.min(penaltyMultiplier, 0.15);
          }
        }

        score *= penaltyMultiplier;

        return { ...movie, similarityScore: score };
      });

      const bestMatch = moviesWithScores.sort((a, b) => b.similarityScore - a.similarityScore)[0];

      if (!bestMatch) return null;

      return {
        id: bestMatch.id,
        title: bestMatch.title,
        year: bestMatch.year,
        poster: bestMatch.poster || "",
        rating: bestMatch.rating || 0,
        imdbRating: bestMatch.imdb_rating,
        imdbVotes: bestMatch.imdb_votes,
        plot: bestMatch.plot || "",
        imdbId: bestMatch.imdb_id,
        voteCount: bestMatch.vote_count,
        originalLanguage: bestMatch.original_language,
        genre: bestMatch.genres || [],
        actors: bestMatch.actors || "",
        director: bestMatch.director || "",
        runtime: bestMatch.runtime || "",
        writing: bestMatch.writing || "",
        sound: bestMatch.sound || "",
        keywords: bestMatch.keywords || [],
      };
    } else {
      return getFallbackRecommendation(allExcludedIds);
    }
  } catch (error) {
    console.error("Error getting guest recommendation:", error);
    return null;
  }
}
