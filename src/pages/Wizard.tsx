import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MovieWizardCard } from "@/components/MovieWizardCard";
import { getNextRecommendation, RecommendationMovie } from "@/lib/recommendationEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Wizard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMovie, setCurrentMovie] = useState<RecommendationMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalRated, setTotalRated] = useState(0);
  const [sessionRatings, setSessionRatings] = useState(0);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    loadTotalRatings();
    loadNextMovie();
  }, [user, navigate]);

  const loadTotalRatings = async () => {
    if (!user) return;
    
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
    if (!user) return;
    
    setLoading(true);
    try {
      const movie = await getNextRecommendation(user.id, skippedIds);
      
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
    if (!user || !currentMovie || saving) return;
    
    setSaving(true);
    try {
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
    }
  };

  const handleSkip = () => {
    if (!currentMovie || saving) return;
    
    // Add to skipped list and load next movie
    setSkippedIds(prev => [...prev, currentMovie.id]);
    loadNextMovie();
  };

  if (!user) {
    return null;
  }

  if (loading && !currentMovie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Movie Wizard</h1>
          </div>
          <p className="text-muted-foreground">
            Rate movies to get personalized recommendations
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-8">
          <Card className="w-auto">
            <CardContent className="pt-6 px-6 pb-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalRated}</div>
                <p className="text-sm text-muted-foreground">Total Ratings</p>
              </div>
            </CardContent>
          </Card>
          
          {sessionRatings > 0 && (
            <Card className="w-auto border-primary">
              <CardContent className="pt-6 px-6 pb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    {sessionRatings}
                  </div>
                  <p className="text-sm text-muted-foreground">This Session</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Movie Card */}
        {currentMovie ? (
          <div className="flex justify-center mb-8">
            <MovieWizardCard
              movie={currentMovie}
              onRate={handleRate}
              onSkip={handleSkip}
              totalRated={totalRated}
            />
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>No More Movies</CardTitle>
              <CardDescription>
                You've rated all available movies! Check back later for more recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/movies")} className="w-full">
                Browse All Movies
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Overlay */}
        {saving && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Saving your rating...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/movies")}>
            Browse Movies
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Wizard;
