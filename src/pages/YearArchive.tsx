import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";

const YearArchive = () => {
  const { year } = useParams<{ year: string }>();
  const yearNumber = year ? parseInt(year, 10) : 0;
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["yearMovies", yearNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("year", yearNumber)
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .limit(5000); // Add limit for better performance

      if (error) throw error;
      return data || [];
    },
    enabled: yearNumber > 0,
  });

  // Calculate average rating
  const avgRating = movies && movies.length > 0
    ? (movies.reduce((sum, m) => sum + (m.imdb_rating || m.rating || 0), 0) / movies.length).toFixed(1)
    : "N/A";

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleNavigateToMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
  };

  if (isLoading) {
    return (
      <ArchiveLayout
        title={`Movies from ${yearNumber}`}
        breadcrumbs={[{ label: yearNumber.toString(), href: `/year/${year}` }]}
        movieCount={0}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, idx) => (
            <Skeleton key={idx} className="aspect-[2/3] rounded-lg" />
          ))}
        </div>
      </ArchiveLayout>
    );
  }

  return (
    <>
      <ArchiveLayout
        title={`Movies from ${yearNumber}`}
        description={`Average rating: ${avgRating}/10`}
        breadcrumbs={[{ label: yearNumber.toString(), href: `/year/${year}` }]}
        movieCount={movies?.length || 0}
      >
        {movies && movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                year={movie.year}
                rating={movie.imdb_rating || movie.rating}
                poster={movie.poster}
                local_poster_url={movie.local_poster_url}
                genre={movie.genres || []}
                imdbId={movie.imdb_id}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies found from {yearNumber}.</p>
          </div>
        )}
      </ArchiveLayout>

      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movieId={selectedMovieId}
        onNavigateToMovie={handleNavigateToMovie}
      />
    </>
  );
};

export default YearArchive;
