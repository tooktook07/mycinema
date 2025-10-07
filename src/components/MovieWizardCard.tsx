import { Star, Heart, ThumbsUp, X, Info, ExternalLink, Search, Users, Globe, SkipForward, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { RecommendationMovie } from "@/lib/recommendationEngine";
import { useNavigate, useLocation } from "react-router-dom";

interface MovieWizardCardProps {
  movie: RecommendationMovie;
  onRate: (rating: number) => void;
  onSkip: () => void;
  totalRated: number;
  isProcessing: boolean;
  processingAction: 'skip' | 'not-interested' | 'like' | 'love' | null;
}

export const MovieWizardCard = ({ movie, onRate, onSkip, totalRated, isProcessing, processingAction }: MovieWizardCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const imageProps = getOptimizedImageProps(movie.poster);
  const hasValidImdbId = movie.imdbId && movie.imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${movie.imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}`;

  const handleMoreInfo = () => {
    navigate(`/movie/${movie.id}`, { state: { backgroundLocation: location } });
  };

  return (
    <Card className="w-full max-w-6xl mx-auto overflow-hidden relative h-[calc(100vh-200px)]">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading next movie...</p>
          </div>
        </div>
      )}
      
      {/* Grid Layout: Poster on left, Info on right */}
      <div className="grid grid-cols-1 md:grid-cols-5 h-full">
        {/* Poster Column */}
        <div className="relative md:col-span-2 h-[50vh] md:h-full">
          {/* Progress Indicator */}
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="secondary" className="text-sm font-semibold">
              Movie #{totalRated + 1}
            </Badge>
          </div>

          {/* More Info Button */}
          <Button 
            size="sm" 
            variant="secondary" 
            className="absolute top-4 right-4 z-10"
            onClick={handleMoreInfo}
          >
            <Info className="h-4 w-4 mr-1" />
            More Info
          </Button>

          {/* Movie Poster */}
          <img 
            {...imageProps}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Column */}
        <div className="md:col-span-3 flex flex-col h-full">
          <ScrollArea className="flex-1 px-6 py-6">
            {/* Movie Title & Meta */}
            <div className="mb-4">
              <h2 className="text-2xl md:text-3xl font-bold line-clamp-2">{movie.title}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary">{movie.year}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{movie.rating}/10</span>
                </div>
                {movie.originalLanguage && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {movie.originalLanguage.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genre.map(g => (
                <Badge key={g} variant="secondary">
                  {g}
                </Badge>
              ))}
            </div>

            {/* Plot Preview */}
            {movie.plot && (
              <p className="text-sm text-muted-foreground line-clamp-4 md:line-clamp-6">
                {movie.plot}
              </p>
            )}
          </ScrollArea>

          {/* Rating Buttons - Fixed at Bottom */}
          <div className="border-t p-4 bg-background">
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  onClick={() => onRate(1)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'not-interested' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Not Interested</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => onRate(5)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'like' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Like</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => onRate(10)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'love' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Love</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={onSkip}
                disabled={isProcessing}
              >
                {isProcessing && processingAction === 'skip' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Next Movie...
                  </>
                ) : (
                  <>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pass
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
