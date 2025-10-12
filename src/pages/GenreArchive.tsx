import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const GenreArchive = () => {
  const { genreName } = useParams<{ genreName: string }>();
  const decodedGenreName = genreName ? decodeArchiveSlug(genreName) : "";
  const displayName = toTitleCase(decodedGenreName);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["genreMovies", decodedGenreName],
    queryFn: async () => {
      // Try exact match first (most common case)
      let { data, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .contains("genres", [decodedGenreName])
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) {
        console.error("Genre query error:", error);
        throw error;
      }
      
      // If no exact match, try normalized matching for variations like "Sci-Fi" vs "SciFi"
      if (!data || data.length === 0) {
        const { data: allGenreMovies, error: fallbackError } = await supabase
          .from("movies")
          .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
          .not("genres", "is", null)
          .order("imdb_rating", { ascending: false, nullsFirst: false })
          .limit(1000);

        if (fallbackError) throw fallbackError;
        
        const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
        const normalizedSearch = normalize(decodedGenreName);
        
        data = allGenreMovies?.filter(movie => 
          movie.genres?.some((g: string) => 
            normalize(g) === normalizedSearch
          )
        ) || [];
      }
      
      return data || [];
    },
    enabled: !!decodedGenreName,
  });

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
        title={`${displayName} Movies`}
        breadcrumbs={[{ label: displayName, href: `/genre/${genreName}` }]}
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
        title={`${displayName} Movies`}
        description={`Explore all ${decodedGenreName.toLowerCase()} movies in our collection`}
        breadcrumbs={[{ label: displayName, href: `/genre/${genreName}` }]}
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
            <p className="text-muted-foreground">No movies found in this genre.</p>
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

export default GenreArchive;
