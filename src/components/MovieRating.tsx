import { useState, useEffect } from "react";
import { ThumbsDown, ThumbsUp, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { saveGuestRating, getGuestRatings } from "@/lib/guestRatings";

interface MovieRatingProps {
  movieId: string;
  movieTitle: string;
  iconOnly?: boolean;
}

type SentimentRating = 1 | 5 | 10 | null;

const sentimentLabels = {
  1: "Not Interested",
  5: "Like",
  10: "Love",
};

export const MovieRating = ({ movieId, movieTitle, iconOnly = false }: MovieRatingProps) => {
  const { user } = useEffectiveAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<SentimentRating>(null);
  const [savedRating, setSavedRating] = useState<SentimentRating>(null);
  const [loading, setLoading] = useState(false);
  const [hasShownGuestPrompt, setHasShownGuestPrompt] = useState(false);

  // Check if user is a real user (not dev mode mock)
  const isRealUser = user && user.id !== 'dev-user-id';

  useEffect(() => {
    if (isRealUser) {
      fetchUserRating();
    } else {
      // Check guest ratings from localStorage
      fetchGuestRating();
    }
  }, [user, movieId, isRealUser]);

  const fetchGuestRating = () => {
    const guestRatings = getGuestRatings();
    const existingRating = guestRatings.find(r => r.movieId === movieId);
    if (existingRating) {
      const sentimentValue = existingRating.rating as SentimentRating;
      setSavedRating(sentimentValue);
      setRating(sentimentValue);
    }
  };

  const fetchUserRating = async () => {
    if (!isRealUser) return;

    try {
      const { data, error } = await supabase
        .from("user_ratings")
        .select("user_rating")
        .eq("user_id", user.id)
        .eq("media_id", movieId)
        .eq("media_type", "movie")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.user_rating) {
        const sentimentValue = data.user_rating as SentimentRating;
        setSavedRating(sentimentValue);
        setRating(sentimentValue);
      }
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const handleSaveRating = async (sentiment: SentimentRating) => {
    if (!sentiment) return;

    setLoading(true);
    try {
      if (isRealUser) {
        // Save to database for logged-in users
        const { error } = await supabase
          .from("user_ratings")
          .upsert({
            user_id: user.id,
            media_id: movieId,
            media_type: "movie",
            user_rating: sentiment,
          }, {
            onConflict: "user_id,media_id,media_type"
          });

        if (error) throw error;

        setSavedRating(sentiment);
        setRating(sentiment);
        setOpen(false);
        toast({
          title: "Rating saved!",
          description: `You rated ${movieTitle}: ${sentimentLabels[sentiment]}`,
        });
        
        queryClient.invalidateQueries({ queryKey: ["user-ratings"] });
      } else {
        // Save to localStorage for guests
        saveGuestRating(movieId, sentiment);
        setSavedRating(sentiment);
        setRating(sentiment);
        setOpen(false);
        
        // Show sign-in prompt only once
        const guestRatings = getGuestRatings();
        if (guestRatings.length === 1 && !hasShownGuestPrompt) {
          setHasShownGuestPrompt(true);
          toast({
            title: "Rating saved locally!",
            description: "Sign in to sync your ratings across devices and get personalized recommendations.",
            duration: 5000,
          });
        } else {
          toast({
            title: "Rating saved!",
            description: `You rated ${movieTitle}: ${sentimentLabels[sentiment]}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error saving rating",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            size="icon"
            variant={savedRating ? "default" : "ghost"}
            className="h-8 w-8"
          >
            {savedRating === 1 && <ThumbsDown className="h-4 w-4" />}
            {savedRating === 5 && <ThumbsUp className="h-4 w-4" />}
            {savedRating === 10 && <Heart className="h-4 w-4 fill-current" />}
            {!savedRating && <Heart className="h-4 w-4" />}
          </Button>
        ) : (
          <Button
            size="sm"
            variant={savedRating ? "default" : "outline"}
            className="gap-1"
          >
            {savedRating === 1 && <ThumbsDown className="h-3.5 w-3.5" />}
            {savedRating === 5 && <ThumbsUp className="h-3.5 w-3.5" />}
            {savedRating === 10 && <Heart className="h-3.5 w-3.5 fill-current" />}
            {!savedRating && <Heart className="h-3.5 w-3.5" />}
            {savedRating ? sentimentLabels[savedRating] : "Rate this movie"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {movieTitle}</DialogTitle>
          <DialogDescription>
            How do you feel about this movie?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleSaveRating(1)}
            disabled={loading}
            className={cn(
              "h-auto py-4 flex flex-col gap-2 hover:bg-destructive/10",
              rating === 1 && "border-destructive bg-destructive/5"
            )}
          >
            <ThumbsDown className="h-8 w-8" />
            <span className="font-semibold">Not Interested</span>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleSaveRating(5)}
            disabled={loading}
            className={cn(
              "h-auto py-4 flex flex-col gap-2 hover:bg-primary/10",
              rating === 5 && "border-primary bg-primary/5"
            )}
          >
            <ThumbsUp className="h-8 w-8" />
            <span className="font-semibold">Like</span>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleSaveRating(10)}
            disabled={loading}
            className={cn(
              "h-auto py-4 flex flex-col gap-2 hover:bg-primary/10",
              rating === 10 && "border-primary bg-primary/5"
            )}
          >
            <Heart className="h-8 w-8" />
            <span className="font-semibold">Love</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};