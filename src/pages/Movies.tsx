import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MOVIES_PER_PAGE = 48;

const SEARCH_SUGGESTIONS = [
  "Inception",
  "Nolan",
  "DiCaprio",
  "Action",
  "Sci-Fi",
  "Comedy",
  "Thriller",
  "Drama",
];

const Movies = () => {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { loading: authLoading } = useAuth();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setOffset(0); // Reset offset when search changes
      setDisplayedMovies([]); // Clear displayed movies
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["movies", offset, debouncedSearch],
    enabled: !authLoading,
    queryFn: async () => {
      const from = offset;
      const to = from + MOVIES_PER_PAGE - 1;

      let query = supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply search filter
      if (debouncedSearch) {
        // Check for structured search patterns (field:value)
        const structuredPatterns = {
          year: /^year:(\d{4})$/i,
          director: /^director:(.+)$/i,
          actor: /^actor:(.+)$/i,
          genre: /^genre:(.+)$/i,
          imdb: /^imdb:(\d+\.?\d*)\+?$/i,
          rating: /^rating:(\d+\.?\d*)\+?$/i,
        };

        let hasStructuredSearch = false;

        // Check for year pattern
        const yearMatch = debouncedSearch.match(structuredPatterns.year);
        if (yearMatch) {
          query = query.eq('year', parseInt(yearMatch[1]));
          hasStructuredSearch = true;
        }

        // Check for director pattern
        const directorMatch = debouncedSearch.match(structuredPatterns.director);
        if (directorMatch) {
          query = query.ilike('director', `%${directorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        // Check for actor pattern
        const actorMatch = debouncedSearch.match(structuredPatterns.actor);
        if (actorMatch) {
          query = query.ilike('actors', `%${actorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        // Check for genre pattern
        const genreMatch = debouncedSearch.match(structuredPatterns.genre);
        if (genreMatch) {
          query = query.contains('genres', [genreMatch[1]]);
          hasStructuredSearch = true;
        }

        // Check for IMDb rating pattern
        const imdbMatch = debouncedSearch.match(structuredPatterns.imdb);
        if (imdbMatch) {
          query = query.gte('imdb_rating', parseFloat(imdbMatch[1]));
          hasStructuredSearch = true;
        }

        // Check for general rating pattern
        const ratingMatch = debouncedSearch.match(structuredPatterns.rating);
        if (ratingMatch && !imdbMatch) {
          query = query.gte('rating', parseFloat(ratingMatch[1]));
          hasStructuredSearch = true;
        }

        // If no structured pattern found, do simple text search (title, actors, director, plot only)
        if (!hasStructuredSearch) {
          const searchPattern = `%${debouncedSearch}%`;
          query = query.or(
            `title.ilike.${searchPattern},actors.ilike.${searchPattern},director.ilike.${searchPattern},plot.ilike.${searchPattern}`
          );
        }
      }

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      
      // Estimate total: if we got a full page, assume there are more movies
      // Show a reasonable upper estimate instead of exact count
      const hasMore = data?.length === MOVIES_PER_PAGE;
      const estimatedTotal = hasMore 
        ? offset + MOVIES_PER_PAGE + MOVIES_PER_PAGE // Current page + at least one more page
        : offset + (data?.length || 0); // Last page
      
      return { movies: data || [], totalCount: estimatedTotal };
    },
  });

  // Append new movies to displayed movies when data changes
  useEffect(() => {
    if (data?.movies) {
      setDisplayedMovies(prev => offset === 0 ? data.movies : [...prev, ...data.movies]);
    }
  }, [data?.movies, offset]);

  const totalCount = data?.totalCount || 0;
  const hasMore = displayedMovies.length < totalCount;

  const handleLoadMore = () => {
    setOffset(prev => prev + MOVIES_PER_PAGE);
  };

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, actors, director, plot... (or try year:2020, imdb:8+)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-11 pr-20 h-11"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSearchText("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Search help"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Search Cheatsheet</DialogTitle>
                    <DialogDescription>
                      Use these patterns to search for movies with precision
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    <div>
                      <h3 className="font-semibold mb-2">Simple Text Search</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Search across title, actors, director, and plot
                      </p>
                      <div className="space-y-1">
                        <code className="block bg-muted px-3 py-2 rounded text-sm">Inception</code>
                        <code className="block bg-muted px-3 py-2 rounded text-sm">Tom Hanks</code>
                        <code className="block bg-muted px-3 py-2 rounded text-sm">space adventure</code>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Structured Search</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Use field:value patterns for precise filtering
                      </p>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Year</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">year:2020</code>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Director</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">director:Christopher Nolan</code>
                          <code className="block bg-muted px-3 py-2 rounded text-sm mt-1">director:Nolan</code>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Actor</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">actor:Leonardo DiCaprio</code>
                          <code className="block bg-muted px-3 py-2 rounded text-sm mt-1">actor:DiCaprio</code>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Genre</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">genre:Action</code>
                          <code className="block bg-muted px-3 py-2 rounded text-sm mt-1">genre:Sci-Fi</code>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">IMDb Rating (minimum)</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">imdb:8+</code>
                          <code className="block bg-muted px-3 py-2 rounded text-sm mt-1">imdb:7.5</code>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">General Rating (minimum)</p>
                          <code className="block bg-muted px-3 py-2 rounded text-sm">rating:8</code>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Tips</h3>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Use simple text search for general queries</li>
                        <li>Use structured patterns for precise filtering</li>
                        <li>Partial names work: "Nolan" finds "Christopher Nolan"</li>
                        <li>Rating searches show movies with that rating or higher</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Search Hint Chips */}
          <div className="flex flex-wrap gap-2 mt-3 max-w-2xl">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSearchText(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="text-muted-foreground">
            Showing {displayedMovies.length} of {totalCount} {totalCount === 1 ? "movie" : "movies"}
          </p>
        </div>

        {isLoading && offset === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 48 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading movies: {error.message}</p>
          </Card>
        )}

        {!isLoading && displayedMovies.length === 0 && !searchText && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No movies found</p>
          </Card>
        )}

        {!isLoading && displayedMovies.length === 0 && searchText && searchText === debouncedSearch && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No movies match your search "{searchText}"</p>
          </Card>
        )}

        {displayedMovies.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  rating={movie.rating || 0}
                  year={movie.year}
                  genre={movie.genres || []}
                  poster={movie.poster || ""}
                  local_poster_url={movie.local_poster_url}
                  imdbId={movie.imdb_id}
                  plot={movie.plot}
                  director={movie.director}
                  actors={movie.actors}
                  runtime={movie.runtime}
                  imdbRating={movie.imdb_rating}
                  imdbVotes={movie.imdb_votes}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {isLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        movieId={selectedMovieId}
        onNavigateToMovie={handleOpenDetail}
      />
    </div>
  );
};

export default Movies;
