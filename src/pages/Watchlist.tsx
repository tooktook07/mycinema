import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getWatchlistMovies } from "@/lib/watchlistService";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Bookmark, Film } from "lucide-react";
import { useState } from "react";

const Watchlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: () => user?.id ? getWatchlistMovies(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Sign In to View Your Watchlist</h2>
          <p className="text-muted-foreground mb-6">
            Create an account to save movies and build your personal watchlist.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In or Sign Up
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Bookmark className="h-8 w-8" />
            <h1 className="text-4xl font-bold">My Watchlist</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const movieCount = movies?.length || 0;

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bookmark className="h-8 w-8" />
            <div>
              <h1 className="text-4xl font-bold">My Watchlist</h1>
              <p className="text-muted-foreground mt-1">
                {movieCount} {movieCount === 1 ? 'movie' : 'movies'} saved
              </p>
            </div>
          </div>
        </div>

        {movieCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="h-24 w-24 text-muted-foreground/20 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Your watchlist is empty</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start adding movies to your watchlist to keep track of what you want to watch!
            </p>
            <Button onClick={() => navigate('/movies')}>
              Browse Movies
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {movies?.map((movie, index) => (
              <MovieCard 
                key={movie.id}
                {...movie}
                moviesList={movies.map(m => ({ id: m.id, title: m.title }))}
                currentIndex={index}
                pageContext="watchlist"
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        movieId={selectedMovieId}
      />
    </div>
  );
};

export default Watchlist;
