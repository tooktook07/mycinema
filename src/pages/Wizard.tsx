import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MovieWizardCard } from "@/components/MovieWizardCard";
import { getNextRecommendation, RecommendationMovie } from "@/lib/recommendationEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveGuestRating, getGuestRatings, getGuestRatedCount, saveGuestSkipped, getGuestSkipped } from "@/lib/guestRatings";
import { clearOldestHalfOfTracking, canClearOlderEntries, clearRecentlyShown, getRecentlyShownStats } from "@/lib/recentlyShownTracker";

interface WizardProps {
  isModal?: boolean;
  onClose?: () => void;
}

const Wizard = ({ isModal = false, onClose }: WizardProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMovie, setCurrentMovie] = useState<RecommendationMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalRated, setTotalRated] = useState(0);
  const [sessionRatings, setSessionRatings] = useState(0);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [processingAction, setProcessingAction] = useState<'skip' | 'not-interested' | 'like' | 'love' | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    setIsGuest(!user);
    loadTotalRatings();
    loadNextMovie();
  }, [user]);

  const loadTotalRatings = async () => {
    if (!user) {
      // Guest user: load from localStorage
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
        // Authenticated user
        movie = await getNextRecommendation(user.id, skippedIds);
      } else {
        // Guest user
        const guestRatings = getGuestRatings();
        const guestSkipped = getGuestSkipped();
        const allSkipped = [...skippedIds, ...guestSkipped];
        
        movie = await getNextRecommendation(
          null, 
          allSkipped,
          guestRatings.map(r => ({ movieId: r.movieId, rating: r.rating }))
        );
      }
      
      if (!movie) {
        toast.info("No more recommendations available at the moment.");
        navigate("/movies");
        return;
      }
      
      setCurrentMovie(movie);
    } catch (error) {
      console.error("Error loading recommendation:", error);
      toast.error("Failed to load recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!currentMovie || saving) return;
    
    // Set processing action based on rating
    if (rating === 1) {
      setProcessingAction('not-interested');
    } else if (rating === 5) {
      setProcessingAction('like');
    } else if (rating === 10) {
      setProcessingAction('love');
    }
    
    setSaving(true);
    try {
      if (user) {
        // Authenticated user: save to database
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
        // Guest user: save to localStorage
        saveGuestRating(currentMovie.id, rating);
      }

      setTotalRated(prev => prev + 1);
      setSessionRatings(prev => prev + 1);
      
      // Show appropriate toast based on rating
      if (rating === 10) {
        toast.success("❤️ Love this! Added to your favorites!");
      } else if (rating === 5) {
        toast.success("👍 I liked this! Added to your collection!");
      } else {
        toast.info("Marked as not for me");
      }

      // Load next movie
      await loadNextMovie();
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Failed to save rating");
    } finally {
      setSaving(false);
      setProcessingAction(null);
    }
  };

  const handleSkip = async () => {
    if (!currentMovie || saving) return;
    
    setProcessingAction('skip');
    setSaving(true);
    
    try {
      const newSkipped = [...skippedIds, currentMovie.id];
      setSkippedIds(newSkipped);
      
      // Save skipped to localStorage for guests
      if (!user) {
        saveGuestSkipped(newSkipped);
      }
      
      await loadNextMovie();
    } finally {
      setSaving(false);
      setProcessingAction(null);
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

  if (loading && !currentMovie) {
    return (
      <div className={isModal ? "h-full flex items-center justify-center" : "min-h-screen flex items-center justify-center"}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={isModal ? "h-full py-6 px-4" : "min-h-screen py-8 px-4"}>
      <div className="container mx-auto max-w-7xl">
        {/* Compact Header with Stats */}
        <div className="flex items-center justify-between mb-6 px-4">
          {/* Left: Title & Description */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold">Movie Wizard</h1>
              {isGuest && (
                <Badge variant="secondary" className="text-xs">
                  🎭 Guest
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Rate movies to get personalized recommendations
            </p>
          </div>

          {/* Right: Session Stats */}
          <div className="flex gap-3">
            {!isGuest && (
              <div className="text-right">
                <div className="text-xl md:text-2xl font-bold">{totalRated}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                  Total Ratings
                </p>
              </div>
            )}
            
            {sessionRatings > 0 && (
              <div className="text-right border-l pl-3">
                <div className="text-xl md:text-2xl font-bold flex items-center justify-end gap-1.5 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {sessionRatings}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                  This Session
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Movie Card */}
        {currentMovie ? (
          <div className="flex justify-center flex-1 mb-6">
            <MovieWizardCard
              movie={currentMovie}
              onRate={handleRate}
              onSkip={handleSkip}
              totalRated={totalRated}
              isProcessing={saving}
              processingAction={processingAction}
              enableViewportTracking={true}
            />
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No More Movies</CardTitle>
              <CardDescription>
                You've seen all available movies! Check back later or clear your viewing history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => {
                    if (isModal && onClose) onClose();
                    navigate("/movies");
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Browse All Movies
                </Button>
                {canClearOlderEntries() ? (
                  <Button 
                    onClick={handleRefreshRecommendations}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Recommendations
                  </Button>
                ) : getRecentlyShownStats().count > 0 && (
                  <Button 
                    onClick={handleClearAllHistory}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear All History
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Wizard;
