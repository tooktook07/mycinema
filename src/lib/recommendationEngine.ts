import { supabase } from "@/integrations/supabase/client";
import { getRecentlyShownMovieIds, markMoviesAsShown } from "./recentlyShownTracker";

// ============= CACHING =============
interface GenreIDFCache {
  scores: Record<string, number>;
  timestamp: number;
}

let genreIDFCache: GenreIDFCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

const RATING_THRESHOLD = 5;
const CANDIDATE_RATING_THRESHOLD = 5.0;
const MIN_RATINGS_FOR_PERSONALIZATION = 5;

const RATING_WEIGHTS = {
  LOVE: 3.0,
  LIKE: 1.0,
  NOT_INTERESTED: -3.0,
};

const TEMPORAL_DECAY = {
  RECENT: 2.0,
  MEDIUM: 1.5,
  OLD: 1.0,
};

const WEIGHTS = {
  GENRE: 0.5,
  DIRECTOR: 0.15,
  ACTOR: 0.15,
  KEYWORD: 0.1,
  LANGUAGE: 0.1,
};

// ============= TF-IDF CALCULATION =============
async function getGenreIDF(): Promise<Record<string, number>> {
  const now = Date.now();
  
  if (genreIDFCache && (now - genreIDFCache.timestamp) < CACHE_TTL) {
    return genreIDFCache.scores;
  }
  
  const { data: allMoviesGenres } = await supabase.from("movies").select("genres").not("genres", "is", null);
  
  const totalMovies = allMoviesGenres?.length || 1;
  const genreDocumentCounts: Record<string, number> = {};
  
  allMoviesGenres?.forEach((movie) => {
    const uniqueGenres = new Set(movie.genres || []);
    uniqueGenres.forEach((genre) => {
      genreDocumentCounts[genre] = (genreDocumentCounts[genre] || 0) + 1;
    });
  });
  
  const scores: Record<string, number> = {};
  Object.keys(genreDocumentCounts).forEach((genre) => {
    scores[genre] = Math.log(totalMovies / genreDocumentCounts[genre]);
  });
  
  genreIDFCache = { scores, timestamp: now };
  return scores;
}

// ============= UNIFIED FALLBACK FUNCTION =============
async function getMoviesFromRatingTiers(
  count: number,
  excludeIds: string[]
): Promise<any[]> {
  const recentlyShownIds = getRecentlyShownMovieIds();
  const allExcludedIds = [...excludeIds, ...recentlyShownIds];

  // Fetch movies from multiple rating tiers
  const { data: tier1Movies } = await supabase
    .from("movies")
    .select("id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url")
    .gte("imdb_rating", 8.0)
    .not("rating", "is", null)
    .order("imdb_rating", { ascending: false })
    .order("vote_count", { ascending: false })
    .limit(300);

  const { data: tier2Movies } = await supabase
    .from("movies")
    .select("id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url")
    .gte("imdb_rating", 7.5)
    .lt("imdb_rating", 8.0)
    .not("rating", "is", null)
    .order("imdb_rating", { ascending: false })
    .order("vote_count", { ascending: false })
    .limit(350);

  const { data: tier3Movies } = await supabase
    .from("movies")
    .select("id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url")
    .gte("imdb_rating", 7.0)
    .lt("imdb_rating", 7.5)
    .not("rating", "is", null)
    .order("imdb_rating", { ascending: false })
    .order("vote_count", { ascending: false })
    .limit(350);

  const allMovies = [...(tier1Movies || []), ...(tier2Movies || []), ...(tier3Movies || [])];
  const filteredMovies = allMovies.filter(m => !allExcludedIds.includes(m.id));

  if (filteredMovies.length === 0) {
    return [];
  }

  // Group by genre for diversity
  const genreGroups: Record<string, typeof filteredMovies> = {};
  filteredMovies.forEach(movie => {
    (movie.genres || []).forEach((genre: string) => {
      if (!genreGroups[genre]) {
        genreGroups[genre] = [];
      }
      genreGroups[genre].push(movie);
    });
  });

  // Randomly select from different genres
  const selectedMovies: typeof filteredMovies = [];
  const genreKeys = Object.keys(genreGroups);
  const usedMovieIds = new Set<string>();

  while (selectedMovies.length < count && selectedMovies.length < filteredMovies.length) {
    const randomGenre = genreKeys[Math.floor(Math.random() * genreKeys.length)];
    const genreMovies = genreGroups[randomGenre];

    if (genreMovies && genreMovies.length > 0) {
      const availableMovies = genreMovies.filter(m => !usedMovieIds.has(m.id));
      if (availableMovies.length > 0) {
        const randomMovie = availableMovies[Math.floor(Math.random() * availableMovies.length)];
        selectedMovies.push(randomMovie);
        usedMovieIds.add(randomMovie.id);
      }
    }
  }

  // Fill remaining slots with random movies
  if (selectedMovies.length < count) {
    const remainingMovies = filteredMovies.filter(m => !usedMovieIds.has(m.id));
    const shuffled = [...remainingMovies].sort(() => Math.random() - 0.5);
    selectedMovies.push(...shuffled.slice(0, count - selectedMovies.length));
  }

  return selectedMovies;
}

// ============= UNIFIED SIMILARITY-BASED RECOMMENDATIONS =============
async function getSimilarityBasedRecommendations(
  userId: string | null,
  count: number,
  excludeIds: string[],
  guestRatings?: { movieId: string; rating: number; createdAt?: Date }[]
): Promise<RecommendationMovie[]> {
  const recentlyShownIds = getRecentlyShownMovieIds();
  const allExcludedIds = [...excludeIds, ...recentlyShownIds];

  // Handle guest ratings
  if (!userId && guestRatings) {
    const meaningfulRatings = guestRatings.filter(
      r => r.rating === 1 || r.rating === 5 || r.rating === 10
    );
    
    if (meaningfulRatings.length < MIN_RATINGS_FOR_PERSONALIZATION) {
      return [];
    }

    const weightedRatings = meaningfulRatings.map(rating => ({
      movieId: rating.movieId,
      weight: rating.rating === 10 ? RATING_WEIGHTS.LOVE :
              rating.rating === 5 ? RATING_WEIGHTS.LIKE :
              RATING_WEIGHTS.NOT_INTERESTED
    }));

    const { data: ratedMoviesData } = await supabase
      .from("movies")
      .select("id, genres, director, actors, keywords, original_language")
      .in("id", weightedRatings.map(r => r.movieId));

    if (!ratedMoviesData || ratedMoviesData.length === 0) {
      return [];
    }

    const { genrePreferences, directorPreferences, actorPreferences, keywordPreferences, languagePreferences } =
      buildPreferences(ratedMoviesData, weightedRatings.map(r => ({ media_id: r.movieId, weight: r.weight })));

    const ratingMap = new Map<string, number>();
    guestRatings.forEach(r => ratingMap.set(r.movieId, r.rating));

    return await scoreAndSelectMovies(
      genrePreferences,
      directorPreferences,
      actorPreferences,
      keywordPreferences,
      languagePreferences,
      allExcludedIds,
      count,
      ratingMap,
      new Set()
    );
  }

  // Handle logged-in user
  if (!userId) {
    return [];
  }

  const { data: userRatings } = await supabase
    .from("user_ratings")
    .select("media_id, user_rating, in_watchlist, created_at")
    .eq("user_id", userId)
    .eq("media_type", "movie");

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

  const meaningfulRatings = (userRatings || []).filter(
    (r) => r.user_rating && (r.user_rating === 1 || r.user_rating === 5 || r.user_rating === 10),
  );

  if (meaningfulRatings.length < MIN_RATINGS_FOR_PERSONALIZATION) {
    return [];
  }

  // Check cache
  const ratingsHash = meaningfulRatings.map(r => `${r.media_id}-${r.user_rating}`).join('|');
  const cachedPrefs = userPreferencesCache.get(userId);

  let genrePreferences: Record<string, number>;
  let directorPreferences: Record<string, number>;
  let actorPreferences: Record<string, number>;
  let keywordPreferences: Record<string, number>;
  let languagePreferences: Record<string, number>;

  if (cachedPrefs && cachedPrefs.ratingsHash === ratingsHash && (Date.now() - cachedPrefs.timestamp) < USER_CACHE_TTL) {
    genrePreferences = cachedPrefs.genrePreferences;
    directorPreferences = cachedPrefs.directorPreferences;
    actorPreferences = cachedPrefs.actorPreferences;
    keywordPreferences = cachedPrefs.keywordPreferences;
    languagePreferences = cachedPrefs.languagePreferences;
  } else {
    const weightedRatings = meaningfulRatings.map((rating) => {
      let baseWeight = 0;
      if (rating.user_rating === 10) baseWeight = RATING_WEIGHTS.LOVE;
      else if (rating.user_rating === 5) baseWeight = RATING_WEIGHTS.LIKE;
      else if (rating.user_rating === 1) baseWeight = RATING_WEIGHTS.NOT_INTERESTED;

      const ageInDays = (Date.now() - new Date(rating.created_at).getTime()) / (1000 * 60 * 60 * 24);
      let temporalMultiplier = TEMPORAL_DECAY.OLD;
      if (ageInDays < 30) temporalMultiplier = TEMPORAL_DECAY.RECENT;
      else if (ageInDays < 90) temporalMultiplier = TEMPORAL_DECAY.MEDIUM;

      return {
        media_id: rating.media_id,
        weight: baseWeight * temporalMultiplier,
      };
    });

    const { data: ratedMoviesData } = await supabase
      .from("movies")
      .select("id, genres, director, actors, keywords, original_language")
      .in("id", weightedRatings.map((r) => r.media_id));

    if (!ratedMoviesData || ratedMoviesData.length === 0) {
      return [];
    }

    const prefs = buildPreferences(ratedMoviesData, weightedRatings);
    genrePreferences = prefs.genrePreferences;
    directorPreferences = prefs.directorPreferences;
    actorPreferences = prefs.actorPreferences;
    keywordPreferences = prefs.keywordPreferences;
    languagePreferences = prefs.languagePreferences;

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

  return await scoreAndSelectMovies(
    genrePreferences,
    directorPreferences,
    actorPreferences,
    keywordPreferences,
    languagePreferences,
    allExcludedIds,
    count,
    ratingMap,
    watchlistSet
  );
}

// ============= HELPER: BUILD PREFERENCES =============
function buildPreferences(
  ratedMoviesData: any[],
  weightedRatings: { media_id?: string; movieId?: string; weight: number }[]
) {
  const genrePreferences: Record<string, number> = {};
  const directorPreferences: Record<string, number> = {};
  const actorPreferences: Record<string, number> = {};
  const keywordPreferences: Record<string, number> = {};
  const languagePreferences: Record<string, number> = {};

  ratedMoviesData.forEach((movie) => {
    const weightData = weightedRatings.find((r) => (r.media_id || r.movieId) === movie.id);
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

  return { genrePreferences, directorPreferences, actorPreferences, keywordPreferences, languagePreferences };
}

// ============= HELPER: SCORE AND SELECT MOVIES =============
async function scoreAndSelectMovies(
  genrePreferences: Record<string, number>,
  directorPreferences: Record<string, number>,
  actorPreferences: Record<string, number>,
  keywordPreferences: Record<string, number>,
  languagePreferences: Record<string, number>,
  excludeIds: string[],
  count: number,
  ratingMap: Map<string, number>,
  watchlistSet: Set<string>
): Promise<RecommendationMovie[]> {
  const genreIDF = await getGenreIDF();

  const { data: candidateMovies } = await supabase
    .from("movies")
    .select("id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, local_poster_url")
    .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
    .not("rating", "is", null)
    .limit(count === 1 ? 750 : 1200);

  const filteredCandidates = (candidateMovies || []).filter(m => !excludeIds.includes(m.id));

  if (!filteredCandidates || filteredCandidates.length === 0) {
    return [];
  }

  const maxGenreWeight = Math.max(...Object.values(genrePreferences).map(Math.abs), 1);
  const maxDirectorWeight = Math.max(...Object.values(directorPreferences).map(Math.abs), 1);
  const maxActorWeight = Math.max(...Object.values(actorPreferences).map(Math.abs), 1);
  const maxKeywordWeight = Math.max(...Object.values(keywordPreferences).map(Math.abs), 1);
  const maxLangWeight = Math.max(...Object.values(languagePreferences).map(Math.abs), 1);

  const moviesWithScores = filteredCandidates.map((movie) => {
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

  const topMatchCount = count === 1 ? 20 : Math.min(count * 2, 40);
  const topMatches = moviesWithScores
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topMatchCount);

  if (!topMatches || topMatches.length === 0) return [];

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
        local_poster_url: (selected as any).local_poster_url,
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
}

// ============= UNIFIED ENTRY POINT =============
export async function getRecommendations(
  userId: string | null,
  count: number,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number; createdAt?: Date }[],
): Promise<RecommendationMovie[]> {
  try {
    // Try similarity-based recommendations first
    const similarityResults = await getSimilarityBasedRecommendations(
      userId,
      count,
      excludeIds,
      guestRatings
    );

    if (similarityResults.length > 0) {
      return similarityResults;
    }

    // Fallback to rating tiers
    const fallbackMovies = await getMoviesFromRatingTiers(count, excludeIds);

    if (fallbackMovies.length === 0) {
      return []; // Pool exhausted
    }

    markMoviesAsShown(fallbackMovies.map(m => m.id));

    return fallbackMovies.map((movie) => ({
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
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
}

// ============= LEGACY FUNCTIONS (for backward compatibility) =============
export async function getBatchRecommendations(
  userId: string | null,
  count: number,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number }[],
): Promise<RecommendationMovie[]> {
  return getRecommendations(userId, count, excludeIds, guestRatings);
}

export async function getNextRecommendation(
  userId: string | null,
  excludeIds: string[] = [],
  guestRatings?: { movieId: string; rating: number }[],
): Promise<RecommendationMovie | null> {
  const results = await getRecommendations(userId, 1, excludeIds, guestRatings);
  return results.length > 0 ? results[0] : null;
}

// ============= SIMILAR MOVIES =============
export async function getSimilarMovies(movieId: string, limit: number = 6): Promise<RecommendationMovie[]> {
  try {
    const { data: referenceMovie } = await supabase
      .from("movies")
      .select("genres, director, actors, keywords, original_language")
      .eq("id", movieId)
      .single();

    if (!referenceMovie) return [];

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

    const moviesWithScores = candidateMovies.map((movie) => {
      let score = 0;

      const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
      const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
      score += genreWeight * 0.4;

      if (movie.director && directorCounts[movie.director]) {
        score += 0.2;
      }

      let actorMatches = 0;
      if (movie.actors) {
        const movieActors = movie.actors.split(",").map((a: string) => a.trim());
        actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
      }
      const actorWeight = Math.min(actorMatches / 3, 1);
      score += actorWeight * 0.25;

      const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
      const keywordWeight = Math.min(keywordMatches / 3, 1);
      score += keywordWeight * 0.1;

      if (movie.original_language && languageCounts[movie.original_language]) {
        score += 0.05;
      }

      return { ...movie, similarityScore: score };
    });

    const topMatches = moviesWithScores
      .filter((m) => m.similarityScore > 0)
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
