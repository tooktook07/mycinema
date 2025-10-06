import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MovieWizardCard } from "@/components/MovieWizardCard";
import { getNextRecommendation, RecommendationMovie } from "@/lib/recommendationEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { WizardSignUpBanner } from "@/components/WizardSignUpBanner";
import { saveGuestRating, getGuestRatings, getGuestRatedCount, saveGuestSkipped, getGuestSkipped } from "@/lib/guestRatings";

interface WizardProps {
  isModal?: boolean;
  onClose?: () => void;
}

const Wizard = ({ isModal = false, onClose }: WizardProps) => {
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
        toast.success("❤️ Added to your loves!");
      } else if (rating === 5) {
        toast.success("👍 Added to your likes!");
      } else {
        toast.info("Marked as not interested");
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

  if (loading && !currentMovie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={isModal ? "h-full py-8 px-4" : "min-h-screen py-8 px-4"}>
      <div className="container mx-auto max-w-7xl h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Movie Wizard</h1>
            {isGuest && (
              <Badge variant="secondary" className="ml-2">
                🎭 Guest Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Rate movies to get personalized recommendations
          </p>
        </div>

        {/* Sign-up banner for guests */}
        {isGuest && <WizardSignUpBanner />}

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-8">
          {!isGuest && (
            <Card className="w-auto">
              <CardContent className="pt-6 px-6 pb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalRated}</div>
                  <p className="text-sm text-muted-foreground">Total Ratings</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {sessionRatings > 0 && (
            <Card className="w-auto border-primary">
              <CardContent className="pt-6 px-6 pb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    {sessionRatings}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isGuest ? "Ratings This Session" : "This Session"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Movie Card */}
        {currentMovie ? (
          <div className="flex-1 flex justify-center items-center mb-8">
            <MovieWizardCard
              movie={currentMovie}
              onRate={handleRate}
              onSkip={handleSkip}
              totalRated={totalRated}
              isProcessing={saving}
              processingAction={processingAction}
            />
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No More Movies</CardTitle>
              <CardDescription>
                {isGuest 
                  ? "Sign up to save your progress and get more personalized recommendations!"
                  : "You've rated all available movies! Check back later for more recommendations."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isGuest && (
                <Button onClick={() => navigate("/auth")} className="w-full" size="lg">
                  Sign Up to Continue
                </Button>
              )}
              <Button 
                onClick={() => navigate("/movies")} 
                className="w-full" 
                variant={isGuest ? "outline" : "default"}
              >
                Browse All Movies
              </Button>
            </CardContent>
          </Card>
        )}


        {/* Action Buttons */}
        {!isModal && (
          <div className="flex justify-center gap-4 mt-8">
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
            <Button variant="outline" onClick={() => navigate("/movies")}>
              Browse Movies
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wizard;
