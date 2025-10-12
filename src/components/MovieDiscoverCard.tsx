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
  sessionRatings: number;
  recentStats: { count: number; oldestShownDaysAgo: number | null };
  onReadMore?: () => void;
  enableViewportTracking?: boolean;
}

export const MovieDiscoverCard = ({ movie, totalRated, sessionRatings, recentStats, onReadMore, enableViewportTracking = false }: MovieDiscoverCardProps) => {
  const imageProps = getOptimizedImageProps(movie.poster, movie.local_poster_url);
  const cardRef = useViewportTracking(movie.id, enableViewportTracking);

  return (
    <div ref={cardRef} className="relative h-screen w-full overflow-hidden">
      {/* Full-screen Poster Background */}
      <div className="absolute inset-0">
        <img
          {...imageProps}
          alt={movie.title}
          className="w-full h-full object-cover object-[center_20%]"
        />
        
        {/* Dark gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/70" />
      </div>

      {/* Bottom Overlay - Movie Info */}
      <div className="absolute bottom-32 left-0 right-0 z-[60] px-6 pb-6 safe-area-bottom">
        {/* Movie Title */}
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-lg leading-tight">
          {movie.title} ({movie.year})
        </h2>

        {/* Meta Info Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-0.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-white text-xs">
              {(movie as any).imdbRating || movie.rating}/10
            </span>
            <span className="text-xs text-white/70">
              ({(movie as any).imdbRating ? 'IMDb' : 'TMDB'})
            </span>
          </div>

          {movie.originalLanguage && (
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-md">
              <Globe className="h-3 w-3 mr-1" />
              {movie.originalLanguage.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {movie.genre.slice(0, 4).map(g => (
            <Badge key={g} className="bg-white/20 text-white border-none backdrop-blur-md">
              {g}
            </Badge>
          ))}
        </div>

        {/* Plot Preview */}
        {movie.plot && (
          <p className="text-xs md:text-sm text-white/90 line-clamp-3 mb-2 drop-shadow-lg leading-relaxed">
            {movie.plot}
          </p>
        )}
      </div>
    </div>
  );
};
