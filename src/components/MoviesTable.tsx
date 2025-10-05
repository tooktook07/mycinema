import { useState, useMemo } from "react";
import { Star, ExternalLink, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Movie } from "@/data/mockMovies";

interface MoviesTableProps {
  movies: Movie[];
  title: string;
}

export const MoviesTable = ({ movies, title }: MoviesTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [movies, searchQuery]);

  const getImdbUrl = (imdbId: string) => {
    return `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
  };

  const getGoogleSearchUrl = (title: string, year: number) => {
    const sanitizedTitle = title.trim().slice(0, 200);
    const sanitizedYear = Math.max(1800, Math.min(2100, year));
    return `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <div className="w-64">
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-foreground font-semibold w-24">Poster</TableHead>
              <TableHead className="text-foreground font-semibold">Title</TableHead>
              <TableHead className="text-foreground font-semibold">Rating</TableHead>
              <TableHead className="text-foreground font-semibold">Year</TableHead>
              <TableHead className="text-foreground font-semibold">Genres</TableHead>
              <TableHead className="text-foreground font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              filteredMovies.map((movie) => (
                <TableRow key={movie.id} className="border-border hover:bg-muted/30">
                  <TableCell className="py-2">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded border border-border"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{movie.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="h-4 w-4 fill-accent" />
                      <span className="font-semibold">{movie.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{movie.year}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {movie.genre.map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={getImdbUrl(movie.imdbId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          IMDB
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={getGoogleSearchUrl(movie.title, movie.year)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-1.5"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Search
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {filteredMovies.length} of {movies.length} {movies.length === 1 ? "result" : "results"}
      </p>
    </div>
  );
};
