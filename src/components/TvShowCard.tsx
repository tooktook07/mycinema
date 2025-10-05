import { Star, ExternalLink, Search, Tv } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TvShow } from "@/data/types";

interface TvShowCardProps extends TvShow {}

export const TvShowCard = ({
  title,
  rating,
  startYear,
  endYear,
  genre,
  poster,
  imdbId,
  seasons,
  episodes,
}: TvShowCardProps) => {
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, startYear));

  const imdbUrl = `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;

  const yearRange = endYear ? `${startYear}-${endYear}` : `${startYear}-Present`;

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
            {yearRange}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Tv className="h-3 w-3" />
            Series
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {seasons} Season{seasons !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {episodes} Episodes
          </Badge>
          {genre.slice(0, 2).map((g) => (
            <Badge key={g} variant="secondary" className="text-xs">
              {g}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a
              href={imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              IMDB
            </a>
          </Button>
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
