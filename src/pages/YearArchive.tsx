import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { SEOHead } from "@/components/SEO/SEOHead";
import { generateBreadcrumbSchema } from "@/components/SEO/schemas/BreadcrumbSchema";

const MOVIES_PER_PAGE = 48;

const YearArchive = () => {
  const { year } = useParams<{ year: string }>();
  const yearNumber = year ? parseInt(year, 10) : 0;
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetched, isPlaceholderData } = useQuery({
    queryKey: ["yearMovies", yearNumber, offset],
    queryFn: async () => {
      const from = offset;
      const to = from + MOVIES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id")
        .eq("year", yearNumber)
        .order("imdb_rating", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      const hasMore = data?.length === MOVIES_PER_PAGE;
      return { movies: data || [], hasMore };
    },
    enabled: yearNumber > 0,
    placeholderData: (previousData) => previousData,
  });

  // Get total count
  const { data: countData } = useQuery({
    queryKey: ["yearMoviesCount", yearNumber],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true })
        .eq("year", yearNumber);

      if (error) throw error;
      return count || 0;
    },
    enabled: yearNumber > 0,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.movies && !isPlaceholderData) {
      setDisplayedMovies(prev => offset === 0 ? data.movies : [...prev, ...data.movies]);
    }
  }, [data?.movies, offset, isPlaceholderData]);

  // Calculate average rating
  const avgRating = displayedMovies && displayedMovies.length > 0
    ? (displayedMovies.reduce((sum, m) => sum + (m.imdb_rating || m.rating || 0), 0) / displayedMovies.length).toFixed(1)
    : "N/A";

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
  const seoTitle = `${yearNumber} Movies - Best Films from ${yearNumber} | CineMatch`;
  const seoDescription = `Discover the best movies from ${yearNumber}. Browse ${countData || displayedMovies.length} films released in ${yearNumber} with ratings averaging ${avgRating}/10. Complete movie list with cast, ratings, and details on CineMatch.`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
    { name: `${yearNumber}`, url: `/year/${year}` },
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
        title={`Movies from ${yearNumber}`}
        breadcrumbs={[{ label: yearNumber.toString(), href: `/year/${year}` }]}
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
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        schema={breadcrumbSchema}
      />
      
      <ArchiveLayout
        title={`Movies from ${yearNumber}`}
        description={`Average rating: ${avgRating}/10`}
        breadcrumbs={[{ label: yearNumber.toString(), href: `/year/${year}` }]}
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
            <p className="text-muted-foreground">No movies found from {yearNumber}.</p>
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

export default YearArchive;
