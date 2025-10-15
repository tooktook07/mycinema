import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
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

const SEARCH_SUGGESTIONS = ["Nolan", "Action", "Science Fiction", "Comedy", "Crime", "Drama", "year:2020", "rating:7"];

// Predefined list of known genres for auto-detection
const KNOWN_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", 
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", 
  "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"
];

// Helper function to check if search term matches a known genre
const detectGenre = (searchTerm: string): string | null => {
  const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
  const normalizedSearch = normalize(searchTerm);
  
  const matchedGenre = KNOWN_GENRES.find(genre => 
    normalize(genre) === normalizedSearch
  );
  
  return matchedGenre || null;
};

const Movies = () => {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userRatingsMap, setUserRatingsMap] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const { loading: authLoading } = useAuth();
  const { user } = useEffectiveAuth();
  const isInitialMount = useRef(true);

  // Fetch total count once on mount (or when search changes)
  const { data: countData } = useQuery({
    queryKey: ["moviesCount", debouncedSearch],
    enabled: !authLoading,
    staleTime: 60000, // Cache for 1 minute
    queryFn: async () => {
      let countQuery = supabase.from("movies").select("*", { count: "exact", head: true });

      // Apply same filters as main query
      if (debouncedSearch) {
        const structuredPatterns = {
          year: /^year:(\d{4})$/i,
          director: /^director:(.+)$/i,
          actor: /^actor:(.+)$/i,
          genre: /^genre:(.+)$/i,
          imdb: /^imdb:(\d+\.?\d*)\+?$/i,
          rating: /^rating:(\d+\.?\d*)\+?$/i,
        };

        let hasStructuredSearch = false;

        const yearMatch = debouncedSearch.match(structuredPatterns.year);
        if (yearMatch) {
          countQuery = countQuery.eq("year", parseInt(yearMatch[1]));
          hasStructuredSearch = true;
        }

        const directorMatch = debouncedSearch.match(structuredPatterns.director);
        if (directorMatch) {
          countQuery = countQuery.ilike("director", `%${directorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        const actorMatch = debouncedSearch.match(structuredPatterns.actor);
        if (actorMatch) {
          countQuery = countQuery.ilike("actors", `%${actorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        const genreMatch = debouncedSearch.match(structuredPatterns.genre);
        if (genreMatch) {
          countQuery = countQuery.contains("genres", [genreMatch[1]]);
          hasStructuredSearch = true;
        }

        const imdbMatch = debouncedSearch.match(structuredPatterns.imdb);
        if (imdbMatch) {
          countQuery = countQuery.gte("imdb_rating", parseFloat(imdbMatch[1]));
          hasStructuredSearch = true;
        }

        const ratingMatch = debouncedSearch.match(structuredPatterns.rating);
        if (ratingMatch && !imdbMatch) {
          countQuery = countQuery.gte("rating", parseFloat(ratingMatch[1]));
          hasStructuredSearch = true;
        }

        if (!hasStructuredSearch) {
          // Check if search term matches a known genre
          const detectedGenre = detectGenre(debouncedSearch);
          if (detectedGenre) {
            countQuery = countQuery.contains("genres", [detectedGenre]);
          } else {
            const searchPattern = `%${debouncedSearch}%`;
            countQuery = countQuery.or(
              `title.ilike.${searchPattern},actors.ilike.${searchPattern},director.ilike.${searchPattern},plot.ilike.${searchPattern}`,
            );
          }
        }
      }

      const { count, error } = await countQuery;
      if (error) throw error;
      return count || 0;
    },
  });

  // Update total count when countData changes
  useEffect(() => {
    if (countData !== undefined) {
      setTotalCount(countData);
    }
  }, [countData]);

  // Debounce search input
  useEffect(() => {
    // Skip clearing on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDebouncedSearch(searchText); // Set initial debounced value
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setLastCursor(null); // Reset cursor when search changes
      setDisplayedMovies([]); // Clear displayed movies
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, error, isFetched, refetch } = useQuery({
    queryKey: ["movies", lastCursor, debouncedSearch],
    enabled: !authLoading,
    queryFn: async () => {
      // Select only needed columns for better performance
      let query = supabase
        .from("movies")
        .select(
          "id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(MOVIES_PER_PAGE);

      // Cursor-based pagination: fetch movies older than lastCursor
      if (lastCursor) {
        query = query.lt("created_at", lastCursor);
      }

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
          query = query.eq("year", parseInt(yearMatch[1]));
          hasStructuredSearch = true;
        }

        // Check for director pattern
        const directorMatch = debouncedSearch.match(structuredPatterns.director);
        if (directorMatch) {
          query = query.ilike("director", `%${directorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        // Check for actor pattern
        const actorMatch = debouncedSearch.match(structuredPatterns.actor);
        if (actorMatch) {
          query = query.ilike("actors", `%${actorMatch[1]}%`);
          hasStructuredSearch = true;
        }

        // Check for genre pattern
        const genreMatch = debouncedSearch.match(structuredPatterns.genre);
        if (genreMatch) {
          query = query.contains("genres", [genreMatch[1]]);
          hasStructuredSearch = true;
        }

        // Check for IMDb rating pattern
        const imdbMatch = debouncedSearch.match(structuredPatterns.imdb);
        if (imdbMatch) {
          query = query.gte("imdb_rating", parseFloat(imdbMatch[1]));
          hasStructuredSearch = true;
        }

        // Check for general rating pattern
        const ratingMatch = debouncedSearch.match(structuredPatterns.rating);
        if (ratingMatch && !imdbMatch) {
          query = query.gte("rating", parseFloat(ratingMatch[1]));
          hasStructuredSearch = true;
        }

        // If no structured pattern found, check for genre match or do simple text search
        if (!hasStructuredSearch) {
          // Check if search term matches a known genre
          const detectedGenre = detectGenre(debouncedSearch);
          if (detectedGenre) {
            query = query.contains("genres", [detectedGenre]);
          } else {
            const searchPattern = `%${debouncedSearch}%`;
            query = query.or(
              `title.ilike.${searchPattern},actors.ilike.${searchPattern},director.ilike.${searchPattern},plot.ilike.${searchPattern}`,
            );
          }
        }
      }

      const { data: moviesData, error: moviesError } = await query;

      if (moviesError) throw moviesError;

      // Batch load user ratings for all movies in this page
      let ratingsData: Record<string, number> = {};
      if (user && moviesData && moviesData.length > 0) {
        const movieIds = moviesData.map((m) => m.id);
        const { data: ratings, error: ratingsError } = await supabase
          .from("user_ratings")
          .select("media_id, user_rating")
          .eq("user_id", user.id)
          .eq("media_type", "movie")
          .in("media_id", movieIds);

        if (!ratingsError && ratings) {
          ratingsData = ratings.reduce(
            (acc, r) => {
              if (r.user_rating) acc[r.media_id] = r.user_rating;
              return acc;
            },
            {} as Record<string, number>,
          );
        }
      }

      const hasMore = moviesData?.length === MOVIES_PER_PAGE;
      const newCursor = hasMore && moviesData.length > 0 ? moviesData[moviesData.length - 1].created_at : null;

      return {
        movies: moviesData || [],
        hasMore,
        newCursor,
        ratingsMap: ratingsData,
      };
    },
  });

  // Append new movies to displayed movies when data changes
  useEffect(() => {
    if (data?.movies) {
      setDisplayedMovies((prev) => (lastCursor === null ? data.movies : [...prev, ...data.movies]));
      if (data.ratingsMap) {
        setUserRatingsMap((prev) => ({ ...prev, ...data.ratingsMap }));
      }
    }
  }, [data?.movies, data?.ratingsMap, lastCursor]);

  const hasMore = data?.hasMore || false;

  const handleLoadMore = () => {
    if (data?.newCursor) {
      setLastCursor(data.newCursor);
    }
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Search help">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Search Cheatsheet</DialogTitle>
                    <DialogDescription>Use these patterns to search for movies with precision</DialogDescription>
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
            {totalCount !== null &&
              displayedMovies.length > 0 &&
              `Showing ${displayedMovies.length} of ${totalCount.toLocaleString()} ${totalCount === 1 ? "movie" : "movies"}`}
            {totalCount === null &&
              displayedMovies.length > 0 &&
              `Showing ${displayedMovies.length} ${displayedMovies.length === 1 ? "movie" : "movies"}`}
          </p>
        </div>

        {((isLoading && !displayedMovies.length) || authLoading) && lastCursor === null && (
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

        {!isLoading && !authLoading && isFetched && displayedMovies.length === 0 && !searchText && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No movies found</p>
          </Card>
        )}

        {!isLoading &&
          !authLoading &&
          isFetched &&
          displayedMovies.length === 0 &&
          searchText &&
          searchText === debouncedSearch && (
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
                  imdbRating={movie.imdb_rating}
                  imdbVotes={movie.imdb_votes}
                  preloadedUserRating={userRatingsMap[movie.id] ?? null}
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
