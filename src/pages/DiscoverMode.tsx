import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, X, ThumbsUp, Heart, SkipForward, Trash2, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MovieDiscoverCard } from "@/components/MovieDiscoverCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { MovieWatchlist } from "@/components/MovieWatchlist";
import { getNextRecommendation, RecommendationMovie } from "@/lib/recommendationEngine";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveGuestRating, getGuestRatings, getGuestRatedCount, saveGuestSkipped, getGuestSkipped } from "@/lib/guestRatings";
import { clearOldestHalfOfTracking, canClearOlderEntries, clearRecentlyShown, getRecentlyShownStats, markMoviesAsShown } from "@/lib/recentlyShownTracker";

const DiscoverMode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMovie, setCurrentMovie] = useState<RecommendationMovie | null>(null);
  const [movieHistory, setMovieHistory] = useState<RecommendationMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalRated, setTotalRated] = useState(0);
  const [sessionRatings, setSessionRatings] = useState(0);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const recentStats = getRecentlyShownStats();

  useEffect(() => {
    loadTotalRatings();
    loadNextMovie();
  }, [user]);

  const loadTotalRatings = async () => {
    if (!user) {
      setTotalRated(getGuestRatedCount());
      return;
    }
    
    try {
      const { count } = await supabase
        .from('user_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('media_type', 'movie')
        .not('user_rating', 'is', null);
      
      setTotalRated(count || 0);
    } catch (error) {
      console.error("Error loading total ratings:", error);
    }
  };

  const loadNextMovie = async () => {
    setLoading(true);
    try {
      let movie: RecommendationMovie | null = null;
      
      if (user) {
        movie = await getNextRecommendation(user.id, skippedIds);
      } else {
        const guestRatings = getGuestRatings();
        const guestSkipped = getGuestSkipped();
        const allSkipped = [...skippedIds, ...guestSkipped];
        
        movie = await getNextRecommendation(
          null, 
          allSkipped,
          guestRatings.map(r => ({ movieId: r.movieId, rating: r.rating }))
        );
      }
      
      // Add current movie to history before showing new one
      if (currentMovie) {
        setMovieHistory(prev => [...prev, currentMovie]);
      }
      
      setCurrentMovie(movie);
    } catch (error) {
      console.error("Error loading recommendation:", error);
      toast.error("Failed to load recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (movieHistory.length === 0 || saving) return;
    
    setSaving(true);
    try {
      // Get the last movie from history
      const prevMovie = movieHistory[movieHistory.length - 1];
      
      // Remove it from history
      setMovieHistory(prev => prev.slice(0, -1));
      
      // Set it as current movie
      setCurrentMovie(prevMovie);
      
      toast.info("⬅️ Previous movie");
    } finally {
      setSaving(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!currentMovie || saving) return;
    
    setSaving(true);
    try {
      if (user) {
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: user.id,
            media_id: currentMovie.id,
            media_type: 'movie',
            user_rating: rating,
          }, {
            onConflict: 'user_id,media_id,media_type'
          });

        if (error) throw error;
      } else {
        saveGuestRating(currentMovie.id, rating);
      }

      setTotalRated(prev => prev + 1);
      setSessionRatings(prev => prev + 1);
      
      if (rating === 10) {
        toast.success("❤️ Love this!");
      } else if (rating === 5) {
        toast.success("👍 I liked this!");
      } else {
        toast.info("Not for me");
      }

      markMoviesAsShown([currentMovie.id]);
      await loadNextMovie();
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Failed to save rating");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!currentMovie || saving) return;
    
    setSaving(true);
    
    try {
      const newSkipped = [...skippedIds, currentMovie.id];
      setSkippedIds(newSkipped);
      
      if (!user) {
        saveGuestSkipped(newSkipped);
      }
      
      markMoviesAsShown([currentMovie.id]);
      await loadNextMovie();
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshRecommendations = async () => {
    clearOldestHalfOfTracking();
    toast.success("Viewing history refreshed!");
    setSkippedIds([]);
    await loadNextMovie();
  };

  const handleClearAllHistory = async () => {
    clearRecentlyShown();
    toast.success("All viewing history cleared!");
    setSkippedIds([]);
    await loadNextMovie();
  };

  const handleNavigateToSimilarMovie = (movieId: string) => {
    if (currentMovie) {
      markMoviesAsShown([currentMovie.id]);
    }
    // In a full implementation, you'd load the specific movie here
    // For now, just load next recommendation
    loadNextMovie();
    setIsDetailModalOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    const screenHeight = window.innerHeight;
    const topZoneThreshold = screenHeight * 0.3; // Top 30%
    const bottomZoneStart = screenHeight * 0.5; // Bottom 50%
    
    // Check if tap started in top 30%
    if (touchStart <= topZoneThreshold) {
      handlePrevious();
    }
    // Check if tap started in bottom 50%
    else if (touchStart >= bottomZoneStart) {
      handleSkip();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div 
        className="relative h-screen w-full max-w-md overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {loading && !currentMovie ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      ) : currentMovie ? (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMovie.id}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <MovieDiscoverCard
                movie={currentMovie}
                totalRated={totalRated}
                sessionRatings={sessionRatings}
                recentStats={recentStats}
                onReadMore={() => setIsDetailModalOpen(true)}
                enableViewportTracking={false}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-6 px-4 safe-area-bottom">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Button
                size="lg"
                variant="outline"
                className="flex flex-col gap-1 h-16 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-red-500/80 hover:text-white hover:border-red-500/80"
                onClick={() => handleRate(1)}
                disabled={saving}
              >
                <X className="h-6 w-6" />
                <span className="text-xs">Not for me</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="flex flex-col gap-1 h-16 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-blue-500/80 hover:text-white hover:border-blue-500/80"
                onClick={() => handleRate(5)}
                disabled={saving}
              >
                <ThumbsUp className="h-6 w-6" />
                <span className="text-xs">I like it</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="flex flex-col gap-1 h-16 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-pink-500/80 hover:text-white hover:border-pink-500/80"
                onClick={() => handleRate(10)}
                disabled={saving}
              >
                <Heart className="h-6 w-6" />
                <span className="text-xs">Love it!</span>
              </Button>
            </div>

            <div className="flex gap-3">
              <MovieWatchlist
                movieId={currentMovie.id}
                movieTitle={currentMovie.title}
                className="flex-1 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border-white/20"
                variant="outline"
              />

              <Button
                variant="outline"
                size="lg"
                onClick={handleSkip}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border-white/20"
              >
                <span>Next Movie</span>
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-6 text-center">
          <Film className="h-20 w-20 text-white/50 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No More Movies</h2>
          <p className="text-white/70 mb-6 max-w-md">
            You've seen all available recommendations. Try refreshing or clearing history.
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {canClearOlderEntries() && (
              <Button
                onClick={handleRefreshRecommendations}
                variant="outline"
                size="lg"
                className="w-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border-white/20"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Refresh Recommendations
              </Button>
            )}
            
            <Button
              onClick={handleClearAllHistory}
              variant="outline"
              size="lg"
              className="w-full bg-white/10 backdrop-blur-md text-white hover:bg-red-500/80 border-white/20"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              Clear All History
            </Button>

            <Button
              onClick={() => navigate('/movies')}
              variant="outline"
              size="lg"
              className="w-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border-white/20"
            >
              Browse All Movies
            </Button>
          </div>
        </div>
      )}

      <MovieDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        movieId={currentMovie?.id || null}
        onNavigateToMovie={handleNavigateToSimilarMovie}
      />
      </div>
    </div>
  );
};

export default DiscoverMode;
