import {
  Film,
  Star,
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  LogIn,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { LastSyncCard } from "@/components/LastSyncCard";
import {
  getRecentlyShownMovieIds,
  markMoviesAsShown,
  clearOldestHalfOfTracking,
  canClearOlderEntries,
  clearRecentlyShown,
  getRecentlyShownStats,
} from "@/lib/recentlyShownTracker";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { getGuestRatedCount, getGuestRatings } from "@/lib/guestRatings";
import { getBatchRecommendations } from "@/lib/recommendationEngine";
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
const RECOMMENDATIONS_COUNT = 20;
const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [excludedRecommendationIds, setExcludedRecommendationIds] = useState<string[]>([]);
  const [totalMoviesViewed, setTotalMoviesViewed] = useState(0);
  const [totalAvailableMovies, setTotalAvailableMovies] = useState(0);
  const [isGuestBannerDismissed, setIsGuestBannerDismissed] = useState(() => {
    return localStorage.getItem("guest_banner_dismissed") === "true";
  });
  const [isHeroBannerDismissed, setIsHeroBannerDismissed] = useState(() => {
    return localStorage.getItem("hero_banner_dismissed") === "true";
  });
  const [isDiscoverCtaDismissed, setIsDiscoverCtaDismissed] = useState(() => {
    return localStorage.getItem("discover_cta_dismissed") === "true";
  });
  const [guestRatingCount, setGuestRatingCount] = useState(0);
  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Track if recommendations have been loaded to prevent auto-reload on tab switch
  const recommendationsLoadedRef = useRef(false);

  useEffect(() => {
    fetchStats();
    // Only fetch recommendations once on initial mount
    if (!recommendationsLoadedRef.current) {
      fetchRecommendations();
      recommendationsLoadedRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setGuestRatingCount(getGuestRatedCount());
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.removeItem("guest_banner_dismissed");
      setIsGuestBannerDismissed(false);
      localStorage.removeItem("discover_cta_dismissed");
      setIsDiscoverCtaDismissed(false);
    }
  }, [user]);

  const handleDismissGuestBanner = () => {
    localStorage.setItem("guest_banner_dismissed", "true");
    setIsGuestBannerDismissed(true);
  };

  const handleDismissHeroBanner = () => {
    localStorage.setItem("hero_banner_dismissed", "true");
    setIsHeroBannerDismissed(true);
  };

  const handleDismissDiscoverCta = () => {
    localStorage.setItem("discover_cta_dismissed", "true");
    setIsDiscoverCtaDismissed(true);
  };
  const fetchStats = async () => {
    try {
      // Fetch total movies
      const { count: moviesCount } = await supabase.from("movies").select("*", {
        count: "exact",
        head: true,
      });

      // Fetch average rating
      const { data: moviesData } = await supabase.from("movies").select("rating");
      const avgRating =
        moviesData && moviesData.length > 0
          ? moviesData.reduce((acc, m) => acc + (m.rating || 0), 0) / moviesData.length
          : 0;

      // Fetch all movies with genres to calculate top genres
      const { data: allMovies } = await supabase.from("movies").select("genres");
      const genreCounts: Record<string, number> = {};
      allMovies?.forEach((movie) => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });
      const topGenres = Object.entries(genreCounts)
        .map(([genre, count]) => ({
          genre,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Fetch recent top-rated movies
      const { data: recentMovies } = await supabase
        .from("movies")
        .select("title, rating, year, poster")
        .order("rating", {
          ascending: false,
        })
        .limit(5);

      // Fetch last sync
      const { data: lastSync } = await supabase
        .from("sync_history")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      // Fetch year range
      const { data: yearData } = await supabase.from("movies").select("year").order("year", { ascending: true });

      let yearRange = null;
      if (yearData && yearData.length > 0) {
        yearRange = {
          earliest: yearData[0].year,
          latest: yearData[yearData.length - 1].year,
        };
      }

      // Fetch user-specific ratings if logged in (only for real users)
      let userRatingsCount = 0;
      let userAvgRating = 0;
      if (user && user.id !== "dev-user-id") {
        const { data: userRatings } = await supabase
          .from("user_ratings")
          .select("user_rating")
          .eq("user_id", user.id)
          .not("user_rating", "is", null);
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
        lastSync,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchRecommendations = async (excludeIds: string[] = [], append: boolean = false) => {
    setLoadingRecommendations(true);
    try {
      // Get recently shown movies to exclude
      const recentlyShownIds = getRecentlyShownMovieIds();
      const allExcludedIds = [...excludeIds, ...recentlyShownIds];

      // Get guest ratings if user is not logged in
      const guestRatings = user ? undefined : getGuestRatings();

      // Use batch recommendations for much better performance
      const results = await getBatchRecommendations(
        user?.id || null,
        RECOMMENDATIONS_COUNT,
        allExcludedIds,
        guestRatings
      );

      // Map to Recommendation type
      const newRecommendations: Recommendation[] = results.map(rec => ({
        id: rec.id,
        title: rec.title,
        year: rec.year,
        poster: rec.poster || "",
        rating: rec.rating || 0,
        plot: rec.plot || "",
        imdbId: rec.imdbId,
        voteCount: rec.voteCount,
        originalLanguage: rec.originalLanguage,
        genre: rec.genre || [],
        actors: rec.actors || "",
        director: rec.director || "",
        runtime: rec.runtime || "",
        writing: rec.writing || "",
        sound: rec.sound || "",
        keywords: rec.keywords || [],
        imdbRating: rec.imdbRating,
        imdbVotes: rec.imdbVotes,
      }));

      setRecommendations((prev) => (append ? [...prev, ...newRecommendations] : newRecommendations));
      setTotalMoviesViewed((prev) => prev + newRecommendations.length);

      // Calculate total available movies
      const { count } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true })
        .not("rating", "is", null);
      setTotalAvailableMovies(count || 0);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleShowMoreRecommendations = async () => {
    setIsLoadingMore(true);
    const currentIds = recommendations.map((r) => r.id);
    setExcludedRecommendationIds([...excludedRecommendationIds, ...currentIds]);
    await fetchRecommendations([...excludedRecommendationIds, ...currentIds], true);
    setIsLoadingMore(false);
  };

  const handleRefreshRecommendations = async () => {
    clearOldestHalfOfTracking();
    toast.success("Viewing history refreshed!");
    setExcludedRecommendationIds([]);
    setTotalMoviesViewed(0);
    recommendationsLoadedRef.current = true; // Keep loaded state
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

  const handleNavigateToMovie = (newMovieId: string) => {
    setSelectedMovieId(newMovieId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  const progressPercentage =
    totalAvailableMovies > 0 ? Math.min((totalMoviesViewed / totalAvailableMovies) * 100, 100) : 0;

  return (
    <div className="min-h-screen pb-32">
      {/* Smart Welcome Banner - Guest Only (shown first) */}
      {!user && !isGuestBannerDismissed && (
        <div className="relative border-b px-4 py-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismissGuestBanner}
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
                  <Link to="/discover">
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
                  You've rated <span className="font-bold text-primary">{guestRatingCount}</span> movie
                  {guestRatingCount !== 1 ? "s" : ""}! Sign up now to save your ratings and unlock personalized AI
                  recommendations.
                </p>
                <Button asChild size="lg">
                  <Link to="/signup">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Sign Up & Save Progress
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section - only show if guest dismissed smart banner OR logged-in user with >= 5 ratings */}
      {((user && stats && stats.userRatingsCount >= 5 && !isHeroBannerDismissed) ||
        (!user && isGuestBannerDismissed && !isHeroBannerDismissed)) && (
        <div className="relative border-b px-4 py-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismissHeroBanner}
            className="absolute top-4 right-4 hover:bg-background/80"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Film className="h-10 w-10" />
              <h1 className="text-4xl font-bold md:text-4xl">Welcome to My Cinema App</h1>
            </div>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-6 text-base font-thin">
              {user
                ? "Your personal movie and TV show statistics"
                : `Discover and rate ${stats?.totalMovies.toLocaleString() || 0} movies${stats?.yearRange ? ` (${stats.yearRange.earliest} - ${stats.yearRange.latest})` : ""}. Sign in to start rating!`}
            </p>
            {!user && (
              <div className="flex justify-center mt-4">
                <Button size="lg" onClick={() => navigate("/signup")}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign Up to Rate Movies
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Discover Mode CTA for logged-in users with < 5 ratings */}
        {user && stats && stats.userRatingsCount < 5 && !isDiscoverCtaDismissed && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismissDiscoverCta}
              className="absolute top-4 right-4 hover:bg-background/80 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
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
                      ? `You've rated ${stats.userRatingsCount} movie${stats.userRatingsCount === 1 ? "" : "s"}. Rate ${5 - stats.userRatingsCount} more to unlock recommendations!`
                      : "Start your journey with Discover Mode"}
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
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg sm:text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Recommendations For You
            </h2>
            <p className="text-sm text-muted-foreground">
              {user
                ? stats?.userRatingsCount && stats.userRatingsCount >= 5
                  ? "Based on your ratings and preferences, we think you'll love these movies"
                  : `Rate 5+ movies to get personalized AI recommendations`
                : "Discover highly-rated movies from our collection"}
            </p>
          </div>

          {loadingRecommendations && !isLoadingMore ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {user ? "Finding movies you'll love..." : "Loading top movies..."}
                </p>
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12 px-4 bg-muted/30 rounded-lg border-2 border-dashed">
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
                ) : (
                  getRecentlyShownStats().count > 0 && (
                    <Button onClick={handleClearAllHistory} variant="default">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All History
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
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
              
              {/* Loading indicator at the end while loading more */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading more movies...</span>
                </div>
              )}
            </>
          )}
        </div>
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
                  <span className="text-muted-foreground font-medium">{Math.round(progressPercentage)}%</span>
                </div>
              </div>

              {/* Load More Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleShowMoreRecommendations}
                  disabled={loadingRecommendations || isLoadingMore}
                  size="lg"
                  className="min-w-[280px]"
                >
                  {isLoadingMore ? (
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
        onNavigateToMovie={handleNavigateToMovie}
      />
    </div>
  );
};
export default Index;
