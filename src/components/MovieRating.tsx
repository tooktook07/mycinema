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

interface MovieRatingProps {
  movieId: string;
  movieTitle: string;
}

type SentimentRating = 1 | 5 | 10 | null;

const sentimentLabels = {
  1: "Not Interested",
  5: "Like",
  10: "Love",
};

export const MovieRating = ({ movieId, movieTitle }: MovieRatingProps) => {
  const { user } = useEffectiveAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<SentimentRating>(null);
  const [savedRating, setSavedRating] = useState<SentimentRating>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRating();
    }
  }, [user, movieId]);

  const fetchUserRating = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_ratings")
        .select("sentiment_rating")
        .eq("user_id", user.id)
        .eq("media_id", movieId)
        .eq("media_type", "movie")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.sentiment_rating) {
        const sentimentValue = data.sentiment_rating as SentimentRating;
        setSavedRating(sentimentValue);
        setRating(sentimentValue);
      }
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const handleSaveRating = async (sentiment: SentimentRating) => {
    if (!user || !sentiment) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_ratings")
        .upsert({
          user_id: user.id,
          media_id: movieId,
          media_type: "movie",
          sentiment_rating: sentiment,
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

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className="gap-1"
      >
        <Heart className="h-3.5 w-3.5" />
        Sign in to rate
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
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
