import { Star, ExternalLink, Search, Users, Globe, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Movie } from "@/data/types";
import { MovieRating } from "@/components/MovieRating";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { useNavigate, useLocation } from "react-router-dom";
interface MovieCardProps extends Movie {
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
      <div className="aspect-[2/3] overflow-hidden relative">
        <img {...imageProps} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <Button 
          size="sm" 
          variant="secondary" 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleMoreInfo}
        >
          <Info className="h-4 w-4 mr-1" />
          More Info
        </Button>
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
          <div className="flex items-center gap-1 text-foreground">
            <Star className="h-4 w-4" />
            <span className="font-bold text-sm">{rating}</span>
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

        {/* Action Icons - At Bottom */}
        <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t">
          <div className="flex items-center gap-1">
            {hasValidImdbId && (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p>View on IMDB</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                  <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                    <Search className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p>Google Search</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div>
                <MovieRating movieId={id} movieTitle={title} iconOnly />
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              <p>Rate this movie</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>;
};