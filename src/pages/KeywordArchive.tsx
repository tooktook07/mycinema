import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const MOVIES_PER_PAGE = 48;

const KeywordArchive = () => {
  const { keyword } = useParams<{ keyword: string }>();
  const decodedKeyword = keyword ? decodeArchiveSlug(keyword) : "";
  const displayKeyword = toTitleCase(decodedKeyword);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["keywordMovies", decodedKeyword, offset],
    queryFn: async () => {
      const from = offset;
      const to = from + MOVIES_PER_PAGE - 1;

      // Try exact match first (most common case)
      let { data, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .contains("keywords", [decodedKeyword])
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        console.error("Keyword query error:", error);
        throw error;
      }
      
      // If no exact match and first page, try normalized matching
      if ((!data || data.length === 0) && offset === 0) {
        const { data: allKeywordMovies, error: fallbackError } = await supabase
          .from("movies")
          .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, keywords")
          .not("keywords", "is", null)
          .order("imdb_rating", { ascending: false, nullsFirst: false })
          .limit(500);

        if (fallbackError) throw fallbackError;
        
        const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
        const normalizedSearch = normalize(decodedKeyword);
        
        const filtered = allKeywordMovies?.filter(movie => 
          movie.keywords?.some((k: string) => 
            normalize(k) === normalizedSearch
          )
        ).map(({ keywords, ...movie }) => movie) || [];

        // Return only the first page of filtered results
        data = filtered.slice(0, MOVIES_PER_PAGE);
      }

      const hasMore = data?.length === MOVIES_PER_PAGE;
      return { movies: data || [], hasMore };
    },
    enabled: !!decodedKeyword,
  });

  // Get total count
  const { data: countData } = useQuery({
    queryKey: ["keywordMoviesCount", decodedKeyword],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true })
        .contains("keywords", [decodedKeyword]);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!decodedKeyword,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.movies) {
      setDisplayedMovies(prev => offset === 0 ? data.movies : [...prev, ...data.movies]);
    }
  }, [data?.movies, offset]);

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleNavigateToMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
  };

  const handleLoadMore = () => {
    setOffset(prev => prev + MOVIES_PER_PAGE);
  };

  const hasMore = data?.hasMore || false;

  if (isLoading && offset === 0) {
    return (
      <ArchiveLayout
        title={`Movies tagged: ${displayKeyword}`}
        breadcrumbs={[{ label: displayKeyword, href: `/keyword/${keyword}` }]}
        movieCount={0}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 48 }).map((_, idx) => (
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
        movieCount={countData || displayedMovies.length}
      >
        {displayedMovies && displayedMovies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedMovies.map((movie) => (
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
