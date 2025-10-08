import { Star, Globe, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { RecommendationMovie } from "@/lib/recommendationEngine";
import { useViewportTracking } from "@/hooks/useViewportTracking";

interface MovieDiscoverCardProps {
  movie: RecommendationMovie;
  totalRated: number;
  onReadMore?: () => void;
  enableViewportTracking?: boolean;
}

export const MovieDiscoverCard = ({ movie, totalRated, onReadMore, enableViewportTracking = false }: MovieDiscoverCardProps) => {
  const imageProps = getOptimizedImageProps(movie.poster);
  const hasValidImdbId = movie.imdbId && movie.imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${movie.imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}`;
  const cardRef = useViewportTracking(movie.id, enableViewportTracking);

  return (
    <Card ref={cardRef} className="w-full max-w-6xl mx-auto overflow-hidden relative h-[calc(100vh-240px)] min-h-[60vh]">
      {/* Grid Layout: Poster on left, Info on right */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-5 h-full">
        {/* Poster Column */}
        <div className="relative lg:col-span-2 aspect-[2/3] h-[50vh] md:h-full md:aspect-[2/3]">
          {/* Progress Indicator */}
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="secondary" className="text-sm font-semibold">
              Movie #{totalRated + 1}
            </Badge>
          </div>

          {/* Movie Poster */}
          <img
            {...imageProps}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Column */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <ScrollArea className="flex-1 px-6 py-6">
            {/* Movie Title & Meta */}
            <div className="mb-4">
              <h2 className="text-2xl md:text-3xl font-bold line-clamp-2">{movie.title}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary">{movie.year}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{(movie as any).imdbRating || movie.rating}/10</span>
                  <span className="text-xs text-muted-foreground">
                    ({(movie as any).imdbRating ? 'IMDb' : 'TMDB'})
                  </span>
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
              <div className="mb-4">
                <p className="text-sm text-muted-foreground line-clamp-4 md:line-clamp-6 mb-3">
                  {movie.plot}
                </p>
                {onReadMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReadMore}
                    className="w-full md:w-auto"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Read More
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};
