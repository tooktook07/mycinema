import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 48;

const Items = () => {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const { loading: authLoading } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["items", offset],
    enabled: !authLoading,
    queryFn: async () => {
      const from = offset;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("movies")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { movies: data || [], totalCount: count || 0 };
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
    setOffset(prev => prev + ITEMS_PER_PAGE);
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">All Items</h1>
          <p className="text-muted-foreground">
            Showing {displayedMovies.length} of {totalCount} {totalCount === 1 ? "movie" : "movies"}
          </p>
        </div>

        {isLoading && offset === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 48 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading items: {error.message}</p>
          </Card>
        )}

        {!isLoading && displayedMovies.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No items found</p>
          </Card>
        )}

        {displayedMovies.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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

export default Items;
