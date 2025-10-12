import { Star, Info, ThumbsDown, ThumbsUp, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Movie } from "@/data/types";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { saveGuestRating, getGuestRatings } from "@/lib/guestRatings";
import { useViewportTracking } from "@/hooks/useViewportTracking";

interface MovieCardProps extends Movie {
  preloadedUserRating?: number | null;
  preloadedInWatchlist?: boolean;
  enableViewportTracking?: boolean;
  onYearClick?: (year: number) => void;
  onGenreClick?: (genre: string) => void;
  onActorClick?: (actor: string) => void;
  onDirectorClick?: (director: string) => void;
  onWriterClick?: (writer: string) => void;
  onKeywordClick?: (keyword: string) => void;
  onOpenDetail?: (movieId: string) => void;
}
export const MovieCard = ({
  id,
  title,
  rating,
  year,
  genre,
  poster,
  local_poster_url,
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
  enableViewportTracking = false,
  onYearClick,
  onGenreClick,
  onActorClick,
  onDirectorClick,
  onWriterClick,
  onKeywordClick,
  onOpenDetail
}: MovieCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useEffectiveAuth();
  const cardRef = useViewportTracking(id, enableViewportTracking);
  
  const [currentRating, setCurrentRating] = useState<number | null>(preloadedUserRating ?? null);
  const [saving, setSaving] = useState(false);
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));
  const hasValidImdbId = imdbId && imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  const imageProps = getOptimizedImageProps(poster, local_poster_url);

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
    onOpenDetail?.(id);
  };
  
  return <TooltipProvider>
    <Card ref={cardRef} className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div
        className="aspect-[2/3] overflow-hidden relative cursor-pointer"
        onClick={handleMoreInfo}
      >
        {/* Poster Image */}
        <img {...imageProps} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        
        {/* Top Gradient Overlay - Title & Rating (Always Visible) */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent p-2 sm:p-3 z-10">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold leading-tight text-white drop-shadow-lg flex-1">{title}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-white cursor-help shrink-0">
                  <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-xs sm:text-sm drop-shadow">
                    {imdbRating ? imdbRating.toFixed(1) : rating.toFixed(1)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{imdbRating ? "IMDb Rating" : "TMDB Rating"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Center - More Info Button (on hover, below title) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
          <Button 
            size="sm" 
            variant="secondary" 
            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs px-2"
          >
            <Info className="h-3 w-3 mr-1" />
            More Info
          </Button>
        </div>

        {/* Bottom Gradient Overlay - Info & Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 sm:p-3">
          {/* Year Badge */}
          <div className="mb-2">
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors bg-white/20 text-white border-white/30" 
              onClick={(e) => {
                e.stopPropagation();
                onYearClick?.(year);
              }}
            >
              {year}
            </Badge>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1 mb-2">
            {genre.slice(0, 2).map(g => (
              <Badge 
                key={g} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors bg-white/20 text-white border-white/30 hidden sm:inline-flex" 
                onClick={(e) => {
                  e.stopPropagation();
                  onGenreClick?.(g);
                }}
              >
                {g}
              </Badge>
            ))}
            {genre.slice(0, 3).map(g => (
              <Badge 
                key={g} 
                variant="secondary" 
                className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors bg-white/20 text-white border-white/30 sm:hidden" 
                onClick={(e) => {
                  e.stopPropagation();
                  onGenreClick?.(g);
                }}
              >
                {g}
              </Badge>
            ))}
          </div>

          {/* Rating Buttons - Show on hover */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant={currentRating === 1 ? "default" : "outline"} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRate(1);
                  }} 
                  disabled={saving}
                  className="h-7 w-7 sm:h-8 sm:w-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <ThumbsDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentRating === 1 ? 'fill-current' : ''}`} />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRate(5);
                  }} 
                  disabled={saving}
                  className="h-7 w-7 sm:h-8 sm:w-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <ThumbsUp className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentRating === 5 ? 'fill-current' : ''}`} />
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRate(10);
                  }} 
                  disabled={saving}
                  className="h-7 w-7 sm:h-8 sm:w-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Heart className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentRating === 10 ? 'fill-current' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Love this!</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  </TooltipProvider>;
};