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
import { SEOHead } from "@/components/SEO/SEOHead";
import { generateBreadcrumbSchema } from "@/components/SEO/schemas/BreadcrumbSchema";

const MOVIES_PER_PAGE = 48;

const KeywordArchive = () => {
  const { keyword } = useParams<{ keyword: string }>();
  const decodedKeyword = keyword ? decodeArchiveSlug(keyword) : "";
  const displayKeyword = toTitleCase(decodedKeyword);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [allFilteredMovies, setAllFilteredMovies] = useState<any[]>([]);

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["keywordMovies", decodedKeyword, offset],
    queryFn: async () => {
      // If we already have filtered movies cached and offset > 0, paginate from cache
      if (offset > 0 && allFilteredMovies.length > 0) {
        const from = offset;
        const to = from + MOVIES_PER_PAGE - 1;
        const paginatedData = allFilteredMovies.slice(from, to + 1);
        const hasMore = allFilteredMovies.length > to + 1;
        return { movies: paginatedData, hasMore };
      }

      // First try exact match with .contains() for performance
      const { data: exactMatch, error: exactError } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .contains("keywords", [decodedKeyword])
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(0, 999);

      if (!exactError && exactMatch && exactMatch.length > 0) {
        // Exact match found, use it
        const paginatedData = exactMatch.slice(0, MOVIES_PER_PAGE);
        const hasMore = exactMatch.length > MOVIES_PER_PAGE;
        return { movies: paginatedData, hasMore, allFiltered: exactMatch };
      }

      // Fallback to client-side filtering for case-insensitive matching
      const { data: allData, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, keywords")
        .not("keywords", "is", null)
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(0, 999);

      if (error) {
        console.error("Keyword query error:", error);
        throw error;
      }

      // Filter client-side with case-insensitive and normalized matching
      const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSearch = normalize(decodedKeyword);
      
      const filtered = allData?.filter(movie => 
        movie.keywords?.some((k: string) => 
          normalize(k) === normalizedSearch
        )
      ).map(({ keywords, ...movie }) => movie) || [];

      const paginatedData = filtered.slice(0, MOVIES_PER_PAGE);
      const hasMore = filtered.length > MOVIES_PER_PAGE;
      
      return { movies: paginatedData, hasMore, allFiltered: filtered };
    },
    enabled: !!decodedKeyword,
  });

  // Get total count with case-insensitive matching
  const { data: countData } = useQuery({
    queryKey: ["keywordMoviesCount", decodedKeyword],
    queryFn: async () => {
      // Fetch all movies with keywords and count client-side
      const { data, error } = await supabase
        .from("movies")
        .select("keywords")
        .not("keywords", "is", null);

      if (error) throw error;
      
      const normalize = (str: string) => str.toLowerCase().replace(/[-\s]/g, '');
      const normalizedSearch = normalize(decodedKeyword);
      
      const count = data?.filter(movie => 
        movie.keywords?.some((k: string) => 
          normalize(k) === normalizedSearch
        )
      ).length || 0;

      return count;
    },
    enabled: !!decodedKeyword,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.movies) {
      if (offset === 0) {
        setDisplayedMovies(data.movies);
        // Cache all filtered movies on first load
        if (data.allFiltered) {
          setAllFilteredMovies(data.allFiltered);
        }
      } else {
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

  // SEO data
  const seoTitle = `${displayKeyword} Movies - Browse Keyword "${displayKeyword}" | CineMatch`;
  const seoDescription = `Explore movies tagged with "${displayKeyword}". Discover films featuring ${displayKeyword} with detailed information and ratings.`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
    { name: displayKeyword, url: `/keyword/${keyword}` },
  ]);

  if ((isLoading || !isFetched) && offset === 0) {
    return (
      <>
        <SEOHead
          title={seoTitle}
          description={seoDescription}
          schema={breadcrumbSchema}
        />
        
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
      </>
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
                  disabled={isLoading && offset > 0}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {isLoading && offset > 0 ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : isFetched ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies found with this keyword.</p>
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

export default KeywordArchive;
