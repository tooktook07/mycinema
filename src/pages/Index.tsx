import { Film, Star, TrendingUp, Calendar, BarChart3, Loader2, LogIn, ArrowRight, Sparkles, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { LastSyncCard } from "@/components/LastSyncCard";
import { getRecentlyShownMovieIds, markMoviesAsShown, clearOldestHalfOfTracking, canClearOlderEntries, clearRecentlyShown, getRecentlyShownStats } from "@/lib/recentlyShownTracker";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { getGuestRatedCount } from "@/lib/guestRatings";
interface Stats {
  totalMovies: number;
  avgMovieRating: number;
  userRatingsCount: number;
  userAvgRating: number;
  yearRange: {
    earliest: number;
    latest: number;
  } | null;
  topGenres: {
    genre: string;
    count: number;
  }[];
  recentMovies: {
    title: string;
    rating: number;
    year: number;
    poster: string;
  }[];
  lastSync: {
    created_at: string;
    imported: number;
    updated: number;
  } | null;
}
interface Recommendation {
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
  metascore?: number;
}
const RATING_THRESHOLD = 7.0; // User's liked movies threshold
const CANDIDATE_RATING_THRESHOLD = 6.5; // Minimum quality for recommendations
const RECOMMENDATIONS_COUNT = 12;
const MIN_RATINGS_FOR_PERSONALIZATION = 5; // Minimum ratings needed for similarity algorithm

// Similarity weights
const WEIGHTS = {
  GENRE: 0.35,
  DIRECTOR: 0.20,
  ACTOR: 0.20,
  KEYWORD: 0.15,
  LANGUAGE: 0.10,
};
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isAdmin
  } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [excludedRecommendationIds, setExcludedRecommendationIds] = useState<string[]>([]);
  const [totalMoviesViewed, setTotalMoviesViewed] = useState(0);
  const [totalAvailableMovies, setTotalAvailableMovies] = useState(0);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('hero_banner_dismissed') === 'true';
  });
  const [guestRatingCount, setGuestRatingCount] = useState(0);
  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecommendations();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setGuestRatingCount(getGuestRatedCount());
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.removeItem('hero_banner_dismissed');
      setIsBannerDismissed(false);
    }
  }, [user]);

  const handleDismissBanner = () => {
    localStorage.setItem('hero_banner_dismissed', 'true');
    setIsBannerDismissed(true);
  };
  const fetchStats = async () => {
    try {
      // Fetch total movies
      const {
        count: moviesCount
      } = await supabase.from("movies").select("*", {
        count: "exact",
        head: true
      });

      // Fetch average rating
      const {
        data: moviesData
      } = await supabase.from("movies").select("rating");
      const avgRating = moviesData && moviesData.length > 0 ? moviesData.reduce((acc, m) => acc + (m.rating || 0), 0) / moviesData.length : 0;

      // Fetch all movies with genres to calculate top genres
      const {
        data: allMovies
      } = await supabase.from("movies").select("genres");
      const genreCounts: Record<string, number> = {};
      allMovies?.forEach(movie => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });
      const topGenres = Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        count
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      // Fetch recent top-rated movies
      const {
        data: recentMovies
      } = await supabase.from("movies").select("title, rating, year, poster").order("rating", {
        ascending: false
      }).limit(5);

      // Fetch last sync
      const {
        data: lastSync
      } = await supabase.from("sync_history").select("*").order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();

      // Fetch year range
      const { data: yearData } = await supabase
        .from("movies")
        .select("year")
        .order("year", { ascending: true });
      
      let yearRange = null;
      if (yearData && yearData.length > 0) {
        yearRange = {
          earliest: yearData[0].year,
          latest: yearData[yearData.length - 1].year
        };
      }

      // Fetch user-specific ratings if logged in (only for real users)
      let userRatingsCount = 0;
      let userAvgRating = 0;
      if (user && user.id !== 'dev-user-id') {
        const {
          data: userRatings
        } = await supabase.from("user_ratings").select("user_rating").eq("user_id", user.id).not("user_rating", "is", null);
        if (userRatings?.length) {
          userRatingsCount = userRatings.length;
          userAvgRating = userRatings.reduce((acc, r) => acc + (r.user_rating || 0), 0) / userRatings.length;
        }
      }
      setStats({
        totalMovies: moviesCount || 0,
        avgMovieRating: avgRating,
        userRatingsCount,
        userAvgRating,
        yearRange,
        topGenres,
        recentMovies: recentMovies || [],
        lastSync
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchRecommendations = async (excludeIds: string[] = []) => {
    setLoadingRecommendations(true);
    try {
      // Get recently shown movies to exclude
      const recentlyShownIds = getRecentlyShownMovieIds();
      
      // Fetch user's rated movies if logged in OR guest ratings from localStorage
      let userLikedMovies: any[] = [];
      const ratingMap = new Map<string, number>();
      const watchlistSet = new Set<string>();
      
      if (user && user.id !== 'dev-user-id') {
        const { data: userRatings } = await supabase
          .from('user_ratings')
          .select('media_id, user_rating, in_watchlist')
          .eq('user_id', user.id)
          .eq('media_type', 'movie');
        
        // Create maps for quick lookup during scoring
        (userRatings || []).forEach(r => {
          if (r.user_rating) {
            ratingMap.set(r.media_id, r.user_rating);
          }
          if (r.in_watchlist) {
            watchlistSet.add(r.media_id);
          }
        });
        
        // Get movies the user liked (rating 5 or 10) with full details
        const likedRatings = Array.from(ratingMap.entries())
          .filter(([_, rating]) => rating === 5 || rating === 10)
          .map(([movieId, _]) => ({ media_id: movieId }));
        
        if (likedRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
          const { data: likedMoviesData } = await supabase
            .from('movies')
            .select('genres, director, actors, keywords, original_language')
            .in('id', likedRatings.map(r => r.media_id));
          
          userLikedMovies = likedMoviesData || [];
        }
      } else {
        // For guests, check localStorage ratings
        const { getGuestRatings } = await import("@/lib/guestRatings");
        const guestRatings = getGuestRatings();
        
        if (guestRatings.length > 0) {
          guestRatings.forEach(r => {
            ratingMap.set(r.movieId, r.rating);
          });
          
          // Get movies the guest liked (rating 5 or 10) with full details
          const likedRatings = Array.from(ratingMap.entries())
            .filter(([_, rating]) => rating === 5 || rating === 10)
            .map(([movieId, _]) => ({ movieId }));
          
          if (likedRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
            const { data: likedMoviesData } = await supabase
              .from('movies')
              .select('genres, director, actors, keywords, original_language')
              .in('id', likedRatings.map(r => r.movieId));
            
            userLikedMovies = likedMoviesData || [];
          }
        }
      }
      
      const ratedMovieIds = Array.from(ratingMap.keys());

      // If user has enough ratings, use similarity algorithm
      if (userLikedMovies.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
        // Analyze user preferences
        const genreCounts: Record<string, number> = {};
        const directorCounts: Record<string, number> = {};
        const actorCounts: Record<string, number> = {};
        const keywordCounts: Record<string, number> = {};
        const languageCounts: Record<string, number> = {};

        userLikedMovies.forEach(movie => {
          // Count genres
          (movie.genres || []).forEach((genre: string) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
          
          // Count directors
          if (movie.director) {
            directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
          }
          
          // Count actors (split by comma)
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

        // Fetch candidate movies (decent quality) - prioritize IMDb ratings
        // Include recently shown movies in exclusion list (but NOT rated movies - they get penalties instead)
        const allExcludedIds = [...excludeIds, ...recentlyShownIds];
        let candidateQuery = supabase
          .from('movies')
          .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, metascore')
          .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
          .not('rating', 'is', null);
        
        if (allExcludedIds.length > 0) {
          candidateQuery = candidateQuery.not('id', 'in', `(${allExcludedIds.join(',')})`);
        }
        
        const { data: candidateMovies } = await candidateQuery.limit(1000);

        // Calculate similarity scores
        const moviesWithScores = (candidateMovies || []).map(movie => {
          let score = 0;
          
          // Boost for IMDb-verified movies
          if ((movie as any).imdb_rating) {
            score += 0.5;
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
          const actorWeight = Math.min(actorMatches / 3, 1); // Cap at 3 matching actors
          score += actorWeight * WEIGHTS.ACTOR;
          
          // Keyword similarity
          const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
          const keywordWeight = Math.min(keywordMatches / 3, 1); // Cap at 3 matching keywords
          score += keywordWeight * WEIGHTS.KEYWORD;
          
          // Language similarity
          if (movie.original_language && languageCounts[movie.original_language]) {
            score += WEIGHTS.LANGUAGE;
          }
          
          // Slight boost for popularity (normalized vote count)
          const popularityBoost = Math.min((movie.vote_count || 0) / 10000, 0.1);
          score += popularityBoost;
          
          // Apply graduated penalties
          let penaltyMultiplier = 1.0;
          
          // Apply watchlist penalty (movies user wants to watch)
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

        // Sort by similarity score and select top 50 matches for diversity
        const TOP_MATCHES_POOL = 50;
        const topMatches = moviesWithScores
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, Math.min(TOP_MATCHES_POOL, moviesWithScores.length));

        // Randomly shuffle and select final recommendations
        const shuffled = topMatches.sort(() => Math.random() - 0.5);
        const topRecommendations = shuffled
          .slice(0, RECOMMENDATIONS_COUNT)
          .map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.year,
            poster: movie.poster || '',
            rating: movie.rating || 0,
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
            keywords: movie.keywords || [],
            imdbRating: (movie as any).imdb_rating,
            imdbVotes: (movie as any).imdb_votes,
            metascore: (movie as any).metascore
          }));

        setRecommendations(topRecommendations);
        setTotalMoviesViewed(prev => prev + topRecommendations.length);
        
        // Calculate total available movies
        const { count } = await supabase
          .from('movies')
          .select('*', { count: 'exact', head: true })
          .or(`imdb_rating.gte.${CANDIDATE_RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${CANDIDATE_RATING_THRESHOLD})`)
          .not('rating', 'is', null)
          .not('id', 'in', `(${[...ratedMovieIds, ...watchlistSet].join(',')})`);
        setTotalAvailableMovies(count || 0);
      } else {
        // Fallback: Show top-rated movies for users/guests with few/no ratings
        // Include recently shown movies in exclusion list (but NOT rated movies)
        const allExcludedIds = [...excludeIds, ...recentlyShownIds];
        
        // Tier 1: Try high-rated movies (7.0+)
        let fallbackQuery = supabase
          .from('movies')
          .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, metascore')
          .or(`imdb_rating.gte.${RATING_THRESHOLD},and(imdb_rating.is.null,rating.gte.${RATING_THRESHOLD})`)
          .not('rating', 'is', null)
          .order('imdb_rating', { ascending: false, nullsFirst: false })
          .order('vote_count', { ascending: false });
        
        if (allExcludedIds.length > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', `(${allExcludedIds.join(',')})`);
        }
        
        let { data: topMovies, error } = await fallbackQuery.limit(200);

        // Tier 2: If no high-rated movies, try all movies with any rating
        if (!topMovies || topMovies.length === 0) {
          fallbackQuery = supabase
            .from('movies')
            .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, metascore')
            .not('rating', 'is', null)
            .order('imdb_rating', { ascending: false, nullsFirst: false })
            .order('vote_count', { ascending: false });
          
          if (allExcludedIds.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', `(${allExcludedIds.join(',')})`);
          }
          
          const result = await fallbackQuery.limit(200);
          topMovies = result.data;
          error = result.error;
        }

        // Tier 3: If still nothing, ignore recently shown (only exclude explicitly passed excludeIds)
        if (!topMovies || topMovies.length === 0) {
          fallbackQuery = supabase
            .from('movies')
            .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords, imdb_rating, imdb_votes, metascore')
            .not('rating', 'is', null)
            .order('imdb_rating', { ascending: false, nullsFirst: false })
            .order('vote_count', { ascending: false });
          
          if (excludeIds.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
          }
          
          const result = await fallbackQuery.limit(200);
          topMovies = result.data;
          error = result.error;
        }

        if (error) throw error;

        const filteredMovies = topMovies || [];

        // Randomly select from top-rated
        const shuffled = filteredMovies.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, RECOMMENDATIONS_COUNT).map(movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          poster: movie.poster || '',
          rating: movie.rating || 0,
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
          keywords: movie.keywords || [],
          imdbRating: (movie as any).imdb_rating,
          imdbVotes: (movie as any).imdb_votes,
          metascore: (movie as any).metascore
        }));

        setRecommendations(selected);
        setTotalMoviesViewed(prev => prev + selected.length);
        
        // Calculate total available movies
        const { count } = await supabase
          .from('movies')
          .select('*', { count: 'exact', head: true })
          .not('rating', 'is', null);
        setTotalAvailableMovies(count || 0);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleShowMoreRecommendations = async () => {
    const currentIds = recommendations.map(r => r.id);
    setExcludedRecommendationIds([...excludedRecommendationIds, ...currentIds]);
    await fetchRecommendations([...excludedRecommendationIds, ...currentIds]);
  };

  const handleRefreshRecommendations = async () => {
    clearOldestHalfOfTracking();
    toast.success("Viewing history refreshed!");
    setExcludedRecommendationIds([]);
    setTotalMoviesViewed(0);
    await fetchRecommendations([]);
  };

  const handleClearAllHistory = async () => {
    clearRecentlyShown();
    toast.success("All viewing history cleared!");
    setExcludedRecommendationIds([]);
    setTotalMoviesViewed(0);
    await fetchRecommendations([]);
  };

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  const progressPercentage = totalAvailableMovies > 0 
    ? Math.min((totalMoviesViewed / totalAvailableMovies) * 100, 100) 
    : 0;

  return <div className="min-h-screen pb-32">
      {/* Smart Welcome Banner - Guest Only */}
      {!user && !isBannerDismissed && (
        <div className="relative border-b px-4 py-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismissBanner}
            className="absolute top-4 right-4 hover:bg-background/80"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="max-w-3xl mx-auto text-center">
            {guestRatingCount === 0 ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Discover Your Perfect Movies</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  Rate just 5 movies to unlock AI-powered personalized recommendations tailored to your taste!
                </p>
                <Button asChild size="lg">
                  <Link to="/movies">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start Rating Now
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Great Progress!</h2>
                </div>
                <p className="text-lg text-muted-foreground mb-4">
                  You've rated <span className="font-bold text-primary">{guestRatingCount}</span> movie{guestRatingCount !== 1 ? 's' : ''}! 
                  Sign up now to save your ratings and unlock personalized AI recommendations.
                </p>
                <Button asChild size="lg">
                  <Link to="/auth">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Sign Up & Save Progress
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="border-b px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10" />
            <h1 className="text-4xl font-bold md:text-4xl">
              Welcome to My Cinema App
            </h1>
          </div>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-6 text-base font-thin">
            {user 
              ? "Your personal movie and TV show statistics" 
              : `Discover and rate ${stats?.totalMovies.toLocaleString() || 0} movies${stats?.yearRange ? ` (${stats.yearRange.earliest} - ${stats.yearRange.latest})` : ''}. Sign in to start rating!`
            }
          </p>
          {!user && <div className="flex justify-center mt-4">
              <Button size="lg" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Rate Movies
              </Button>
            </div>}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">

        {/* Wizard CTA for users with < 5 ratings */}
        {stats && stats.userRatingsCount < 5 && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold">Discover Your Perfect Movies</h3>
                  </div>
                  <p className="text-muted-foreground mb-1">
                    Rate a few movies to get AI-powered personalized recommendations
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats.userRatingsCount > 0 
                      ? `You've rated ${stats.userRatingsCount} movie${stats.userRatingsCount === 1 ? '' : 's'}. Rate ${5 - stats.userRatingsCount} more to unlock recommendations!`
                      : "Start your journey with the Rating Wizard"}
                  </p>
                </div>
                <Button size="lg" onClick={() => navigate("/movies")} className="min-w-[200px]">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Rating Movies
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Recommendations for all users */}
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {user ? <>
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    AI Recommendations For You
                  </> : <>
                    <Star className="h-5 w-5 text-yellow-500" />
                    Top Rated Movies
                  </>}
              </CardTitle>
              <CardDescription>
                {user 
                  ? stats?.userRatingsCount && stats.userRatingsCount >= MIN_RATINGS_FOR_PERSONALIZATION
                    ? "Based on your ratings and preferences, we think you'll love these movies"
                    : `Rate ${MIN_RATINGS_FOR_PERSONALIZATION}+ movies to get personalized AI recommendations`
                  : "Discover highly-rated movies from our collection"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecommendations ? <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {user ? "Finding movies you'll love..." : "Loading top movies..."}
                    </p>
                  </div>
                </div> : recommendations.length === 0 ? <div className="text-center py-12 px-4 bg-muted/30 rounded-lg border-2 border-dashed">
                  <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">No More Movies</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You've seen all available movies! Check back later or clear your viewing history.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button onClick={() => navigate("/movies")} variant="outline">
                      <Film className="h-4 w-4 mr-2" />
                      Browse Movies
                    </Button>
                    {canClearOlderEntries() ? (
                      <Button onClick={handleRefreshRecommendations} variant="default">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Recommendations
                      </Button>
                    ) : getRecentlyShownStats().count > 0 && (
                      <Button onClick={handleClearAllHistory} variant="default">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All History
                      </Button>
                    )}
                  </div>
                </div> : <>
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {recommendations?.map((movie, index) => (
                      <MovieCard 
                        key={movie.id}
                        id={movie.id} 
                        title={movie.title} 
                        year={movie.year} 
                        rating={movie.rating} 
                        genre={movie.genre} 
                        poster={movie.poster} 
                        imdbId={movie.imdbId} 
                        imdbRating={movie.imdbRating} 
                        imdbVotes={movie.imdbVotes} 
                        metascore={movie.metascore} 
                        plot={movie.plot} 
                        voteCount={movie.voteCount} 
                        originalLanguage={movie.originalLanguage} 
                        actors={movie.actors} 
                        director={movie.director} 
                        runtime={movie.runtime} 
                        writing={movie.writing} 
                        sound={movie.sound} 
                        keywords={movie.keywords}
                        enableViewportTracking={true}
                        onOpenDetail={handleOpenDetail}
                      />
                     ))}
                  </div>
                </>}
            </CardContent>
        </Card>
      </div>

      {/* Sticky Load More Button */}
      {recommendations.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md bg-background/95 shadow-lg">
          <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col gap-3">
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {totalMoviesViewed} of ~{totalAvailableMovies} movies
                  </span>
                  <span className="text-muted-foreground font-medium">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
              
              {/* Load More Button */}
              <div className="flex justify-center">
                <Button 
                  onClick={handleShowMoreRecommendations}
                  disabled={loadingRecommendations}
                  size="lg"
                  className="min-w-[280px]"
                >
                  {loadingRecommendations ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading More...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Load More Recommendations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        movieId={selectedMovieId}
      />
    </div>;
};
export default Index;