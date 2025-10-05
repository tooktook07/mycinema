import { useState, useEffect } from "react";
import { Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface MovieRatingProps {
  movieId: string;
  movieTitle: string;
}

export const MovieRating = ({ movieId, movieTitle }: MovieRatingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [savedRating, setSavedRating] = useState<number | null>(null);
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
        .from("user_movie_data")
        .select("user_rating")
        .eq("user_id", user.id)
        .eq("movie_id", movieId)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.user_rating) {
        setSavedRating(data.user_rating);
        setRating(data.user_rating);
      }
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const handleSaveRating = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_movie_data")
        .upsert({
          user_id: user.id,
          movie_id: movieId,
          user_rating: rating,
        }, {
          onConflict: "user_id,movie_id"
        });

      if (error) throw error;

      setSavedRating(rating);
      setOpen(false);
      toast({
        title: "Rating saved!",
        description: `You rated ${movieTitle} ${rating}/10`,
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
        <Star className="h-3.5 w-3.5" />
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
          <Star className={savedRating ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
          {savedRating ? `Your rating: ${savedRating}/10` : "Rate this movie"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {movieTitle}</DialogTitle>
          <DialogDescription>
            Share your rating with other users
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <Star className="h-8 w-8 fill-primary text-primary" />
            <span className="text-5xl font-bold">{rating}</span>
            <span className="text-2xl text-muted-foreground">/10</span>
          </div>
          <Slider
            value={[rating]}
            onValueChange={(values) => setRating(values[0])}
            min={1}
            max={10}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Terrible</span>
            <span>Masterpiece</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveRating}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Saving..." : "Save Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
