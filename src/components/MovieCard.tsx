import { Star, Globe, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Movie } from "@/data/types";
import { MovieRating } from "@/components/MovieRating";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { useNavigate, useLocation } from "react-router-dom";
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
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));
  const hasValidImdbId = imdbId && imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  const imageProps = getOptimizedImageProps(poster);

  const handleMoreInfo = () => {
    navigate(`/movie/${id}`, { state: { backgroundLocation: location } });
  };
  return <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
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
            onClick={(e) => e.stopPropagation()}
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
          <div className="flex items-center gap-2">
            {/* IMDb Rating (prioritized when available) */}
            {imdbRating ? (
              <>
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold text-sm">{imdbRating.toFixed(1)}</span>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  IMDb
                </Badge>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-foreground">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold text-sm">{rating.toFixed(1)}</span>
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  TMDB
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
          {genre.slice(0, 3).map(g => (
            <Badge key={g} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => onGenreClick?.(g)}>
              {g}
            </Badge>
          ))}
        </div>

        {/* Rating Options - At Bottom */}
        <div className="mt-4 pt-3 border-t">
          <MovieRating 
            movieId={id} 
            movieTitle={title} 
            iconOnly={false}
            preloadedRating={preloadedUserRating}
          />
        </div>
      </CardContent>
    </Card>;
};