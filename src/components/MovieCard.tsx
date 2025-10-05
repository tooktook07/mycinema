import { Star, ExternalLink, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MovieCardProps {
  title: string;
  rating: number;
  year: number;
  genre: string[];
  poster: string;
  type: "movie" | "series";
  imdbId: string;
}

export const MovieCard = ({ title, rating, year, genre, poster, type, imdbId }: MovieCardProps) => {
  // Sanitize and validate inputs
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));
  
  const imdbUrl = `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
  const googleSearchQuery = `${sanitizedTitle} ${sanitizedYear}`.replace(/\s+/g, '+');
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}`;
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
          <div className="flex items-center gap-1 text-accent shrink-0">
            <Star className="h-4 w-4 fill-accent" />
            <span className="font-bold">{rating}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {year}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {type === "movie" ? "Movie" : "Series"}
          </Badge>
          {genre.slice(0, 2).map((g) => (
            <Badge key={g} variant="secondary" className="text-xs">
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
            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
