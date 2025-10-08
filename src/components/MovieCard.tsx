import { Star, Globe, Info, ThumbsDown, ThumbsUp, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Movie } from "@/data/types";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { saveGuestRating, getGuestRatings } from "@/lib/guestRatings";
interface MovieCardProps extends Movie {
  preloadedUserRating?: number | null;
  preloadedInWatchlist?: boolean;
  onYearClick?: (year: number) => void;
  onGenreClick?: (genre: string) => void;
  onLanguageClick?: (language: string) => void;
  onActorClick?: (actor: string) => void;
  onDirectorClick?: (director: string) => void;
  onWriterClick?: (writer: string) => void;
  onKeywordClick?: (keyword: string) => void;
}
export const MovieCard = ({
  id,
  title,
  rating,
  year,
  genre,
  poster,
  imdbId,
  voteCount,
  originalLanguage,
  plot,
  director,
  actors,
  runtime,
  writing,
  sound,
  keywords,
  imdbRating,
  imdbVotes,
  metascore,
  boxOffice,
  awards,
  dataSources,
  preloadedUserRating,
  preloadedInWatchlist,
  onYearClick,
  onGenreClick,
  onLanguageClick,
  onActorClick,
  onDirectorClick,
  onWriterClick,
  onKeywordClick
}: MovieCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useEffectiveAuth();
  
  const [currentRating, setCurrentRating] = useState<number | null>(preloadedUserRating ?? null);
  const [saving, setSaving] = useState(false);
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));
  const hasValidImdbId = imdbId && imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  const imageProps = getOptimizedImageProps(poster);

  useEffect(() => {
    const loadRating = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_ratings')
          .select('user_rating')
          .eq('user_id', user.id)
          .eq('media_id', id)
          .eq('media_type', 'movie')
          .maybeSingle();
        
        if (data?.user_rating) {
          setCurrentRating(data.user_rating);
        }
      } else {
        const guestRatings = getGuestRatings();
        const guestRating = guestRatings.find(r => r.movieId === id);
        if (guestRating) {
          setCurrentRating(guestRating.rating);
        }
      }
    };
    
    if (preloadedUserRating === undefined || preloadedUserRating === null) {
      loadRating();
    }
  }, [id, user, preloadedUserRating]);

  const handleRate = async (ratingValue: number) => {
    setSaving(true);
    
    try {
      if (user) {
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: user.id,
            media_id: id,
            media_type: 'movie',
            user_rating: ratingValue,
          }, {
            onConflict: 'user_id,media_id,media_type'
          });

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['userRatings'] });
      } else {
        saveGuestRating(id, ratingValue);
      }
      
      setCurrentRating(ratingValue);
      
      const messages = {
        1: "Marked as not for me",
        5: "👍 I liked this! Added to your collection!",
        10: "❤️ Love this! Added to your favorites!"
      };
      
      toast({
        title: messages[ratingValue as keyof typeof messages],
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: "Error saving rating",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMoreInfo = () => {
    navigate(`/movie/${id}`, { state: { backgroundLocation: location } });
  };
  
  return <TooltipProvider>
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div 
        className="aspect-[2/3] overflow-hidden relative cursor-pointer"
        onClick={handleMoreInfo}
      >
        <img {...imageProps} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Button 
            size="sm" 
            variant="secondary" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Info className="h-4 w-4 mr-1" />
            More Info
          </Button>
        </div>
      </div>
      <CardContent className="p-4">
        {/* Title - Full Width */}
        <h3 className="line-clamp-2 text-base font-semibold leading-tight">{title}</h3>
        
        {/* Info Row: Left (Year + Lang) | Right (Rating) */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => onYearClick?.(year)}>
              {year}
            </Badge>
            {originalLanguage && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 cursor-pointer hover:bg-secondary transition-colors" onClick={() => onLanguageClick?.(originalLanguage)}>
                <Globe className="h-3 w-3" />
                {originalLanguage.toUpperCase()}
              </Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-foreground cursor-help">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-bold text-sm">
                  {imdbRating ? imdbRating.toFixed(1) : rating.toFixed(1)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{imdbRating ? "IMDb Rating" : "TMDB Rating"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
          {genre.slice(0, 3).map(g => (
            <Badge key={g} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => onGenreClick?.(g)}>
              {g}
            </Badge>
          ))}
        </div>

        {/* Rating Buttons - At Bottom */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={currentRating === 1 ? "default" : "outline"} 
                onClick={() => handleRate(1)} 
                disabled={saving}
                className="h-9 w-9"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Not for me</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={currentRating === 5 ? "default" : "outline"}
                onClick={() => handleRate(5)} 
                disabled={saving}
                className="h-9 w-9"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">I liked this</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={currentRating === 10 ? "default" : "outline"}
                onClick={() => handleRate(10)} 
                disabled={saving}
                className="h-9 w-9"
              >
                <Heart className="h-4 w-4 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Love this!</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  </TooltipProvider>;
};