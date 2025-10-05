import { Star, ExternalLink, Search, Users, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Movie } from "@/data/types";

interface MovieCardProps extends Movie {
  onYearClick?: (year: number) => void;
  onGenreClick?: (genre: string) => void;
}

export const MovieCard = ({ 
  title, 
  rating, 
  year, 
  genre, 
  poster, 
  imdbId, 
  voteCount, 
  originalLanguage,
  onYearClick,
  onGenreClick
}: MovieCardProps) => {
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));

  const imdbUrl = `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  return (
    <Card className="group overflow-hidden border-border bg-gradient-to-b from-card to-card/80 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_hsl(262_52%_47%/0.3)]">
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={poster}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2">{title}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 text-accent">
              <Star className="h-4 w-4 fill-accent" />
              <span className="font-bold">{rating}</span>
            </div>
            {voteCount !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Users className="h-3 w-3" />
                <span>{voteCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge 
            variant="secondary" 
            className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => onYearClick?.(year)}
          >
            {year}
          </Badge>
          {originalLanguage && (
            <Badge 
              variant="outline" 
              className="text-xs flex items-center gap-1 cursor-pointer hover:bg-accent/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Globe className="h-3 w-3" />
              {originalLanguage.toUpperCase()}
            </Badge>
          )}
          {genre.slice(0, 2).map((g) => (
            <Badge 
              key={g} 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => onGenreClick?.(g)}
            >
              {g}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            asChild
          >
            <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              IMDB
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            asChild
          >
            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
