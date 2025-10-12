import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const KeywordArchive = () => {
  const { keyword } = useParams<{ keyword: string }>();
  const decodedKeyword = keyword ? decodeArchiveSlug(keyword) : "";
  const displayKeyword = toTitleCase(decodedKeyword);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["keywordMovies", decodedKeyword],
    queryFn: async () => {
      // Normalize function to handle hyphens and spaces in keyword names
      const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSearch = normalize(decodedKeyword);
      
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .not("keywords", "is", null)
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .limit(5000);

      if (error) {
        console.error("Keyword query error:", error);
        throw error;
      }
      
      // Filter with normalized comparison to match variations with/without hyphens
      const filtered = data?.filter(movie => 
        movie.keywords?.some((k: string) => 
          normalize(k) === normalizedSearch
        )
      ) || [];
      
      return filtered;
    },
    enabled: !!decodedKeyword,
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
        title={`Movies tagged: ${displayKeyword}`}
        breadcrumbs={[{ label: displayKeyword, href: `/keyword/${keyword}` }]}
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
        title={`Movies tagged: ${displayKeyword}`}
        description={`Discover movies with the ${decodedKeyword} theme`}
        breadcrumbs={[{ label: displayKeyword, href: `/keyword/${keyword}` }]}
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
            <p className="text-muted-foreground">No movies found with this keyword.</p>
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

export default KeywordArchive;
