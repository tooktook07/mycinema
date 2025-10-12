import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const MOVIES_PER_PAGE = 48;

const GenreArchive = () => {
  const { genreName } = useParams<{ genreName: string }>();
  const decodedGenreName = genreName ? decodeArchiveSlug(genreName) : "";
  const displayGenreName = toTitleCase(decodedGenreName);
  
  console.log("🔍 GenreArchive Debug:", {
    urlParam: genreName,
    decoded: decodedGenreName,
    titleCase: toTitleCase(decodedGenreName),
    display: displayGenreName
  });
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const isInitialMount = useRef(true);

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["genreMovies", decodedGenreName, offset],
    queryFn: async () => {
      const from = offset;
      const to = from + MOVIES_PER_PAGE - 1;
      const searchGenre = toTitleCase(decodedGenreName);

      console.log("🔍 Query attempt:", { searchGenre, from, to });

      // Try exact match with .contains() using TitleCase for performance
      const { data: exactMatch, error: exactError } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .contains("genres", [searchGenre])
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(from, to);

      console.log("🔍 Exact match result:", { 
        error: exactError, 
        count: exactMatch?.length,
        firstMovie: exactMatch?.[0]?.title,
        sampleGenres: exactMatch?.[0]?.genres
      });

      if (!exactError && exactMatch && exactMatch.length > 0) {
        // Exact match found, use it with proper pagination
        const hasMore = exactMatch.length === MOVIES_PER_PAGE;
        console.log("✅ Using exact match", { count: exactMatch.length, hasMore });
        return { movies: exactMatch, hasMore };
      }

      // Fallback to client-side filtering for edge cases
      console.log("⚠️ Exact match failed, falling back to client-side filter");
      
      const { data: allData, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .not("genres", "is", null)
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(0, 999);

      if (error) {
        console.error("❌ Genre query error:", error);
        throw error;
      }

      console.log("🔍 Fetched movies for filtering:", { 
        total: allData?.length,
        sampleGenres: allData?.slice(0, 3).map(m => ({ title: m.title, genres: m.genres }))
      });

      // Filter client-side with case-insensitive and normalized matching
      const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSearch = normalize(decodedGenreName);
      
      console.log("🔍 Normalized search:", normalizedSearch);
      
      const filtered = allData?.filter(movie => 
        movie.genres?.some((g: string) => 
          normalize(g) === normalizedSearch
        )
      ) || [];

      console.log("🔍 Client-side filter result:", { 
        matched: filtered.length,
        sampleTitles: filtered.slice(0, 5).map(m => m.title)
      });

      const paginatedData = filtered.slice(from, to + 1);
      const hasMore = filtered.length > to + 1;
      
      console.log("✅ Returning paginated data:", { count: paginatedData.length, hasMore });
      return { movies: paginatedData, hasMore };
    },
    enabled: !!decodedGenreName,
  });

  // Get total count with case-insensitive matching
  const { data: countData } = useQuery({
    queryKey: ["genreMoviesCount", decodedGenreName],
    queryFn: async () => {
      // Fetch all movies with genres and count client-side due to case sensitivity
      const { data, error } = await supabase
        .from("movies")
        .select("genres")
        .not("genres", "is", null);

      if (error) throw error;
      
      const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSearch = normalize(decodedGenreName);
      
      const count = data?.filter(movie => 
        movie.genres?.some((g: string) => 
          normalize(g) === normalizedSearch
        )
      ).length || 0;

      return count;
    },
    enabled: !!decodedGenreName,
    staleTime: 60000,
  });

  useEffect(() => {
    console.log("🔍 useEffect triggered:", { 
      isInitialMount: isInitialMount.current,
      hasData: !!data?.movies,
      movieCount: data?.movies?.length,
      offset,
      currentDisplayed: displayedMovies.length
    });

    // Skip clearing on initial mount to prevent race condition
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (data?.movies) {
        console.log("✅ Setting initial movies:", data.movies.length);
        setDisplayedMovies(data.movies);
      }
      return;
    }

    if (data?.movies) {
      if (offset === 0) {
        console.log("✅ Resetting displayed movies:", data.movies.length);
        setDisplayedMovies(data.movies);
      } else {
        console.log("✅ Appending movies:", data.movies.length);
        setDisplayedMovies(prev => [...prev, ...data.movies]);
      }
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

  if ((isLoading || !isFetched) && offset === 0) {
    return (
      <ArchiveLayout
        title={displayGenreName}
        breadcrumbs={[{ label: displayGenreName, href: `/genre/${genreName}` }]}
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
        title={displayGenreName}
        description={`Explore the best ${decodedGenreName} films`}
        breadcrumbs={[{ label: displayGenreName, href: `/genre/${genreName}` }]}
        movieCount={countData || displayedMovies.length}
      >
        {isFetched && displayedMovies && displayedMovies.length > 0 ? (
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
        ) : isFetched ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies found for this genre.</p>
          </div>
        ) : null}
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
