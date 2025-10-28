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

const CountryArchive = () => {
  const { country } = useParams<{ country: string }>();
  const decodedCountry = country ? decodeArchiveSlug(country) : "";
  const displayName = toTitleCase(decodedCountry);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [allFilteredMovies, setAllFilteredMovies] = useState<any[]>([]);

  // Fetch all movies with production countries and filter client-side
  const { data, isLoading, isFetched, isPlaceholderData } = useQuery({
    queryKey: ["countryMovies", decodedCountry, offset],
    queryFn: async () => {
      // Fetch all movies that have production_countries
      const { data: allMovies, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, production_countries")
        .not("production_countries", "is", null)
        .order("imdb_rating", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Filter client-side for case-insensitive match
      const filtered = (allMovies || []).filter((movie) => {
        if (!movie.production_countries || !Array.isArray(movie.production_countries)) return false;
        return movie.production_countries.some((ctry: any) => {
          const countryName = ctry.name || ctry;
          return countryName.toLowerCase() === decodedCountry.toLowerCase();
        });
      });

      return { movies: filtered, hasMore: false };
    },
    enabled: !!decodedCountry,
    staleTime: 60000,
  });

  // Store all filtered movies once
  useEffect(() => {
    if (data?.movies && offset === 0) {
      setAllFilteredMovies(data.movies);
    }
  }, [data?.movies, offset]);

  // Get total count
  const totalCount = allFilteredMovies.length;

  useEffect(() => {
    if (allFilteredMovies.length > 0) {
      const from = offset;
      const to = from + MOVIES_PER_PAGE;
      const paginated = allFilteredMovies.slice(from, to);
      
      setDisplayedMovies(prev => offset === 0 ? paginated : [...prev, ...paginated]);
    }
  }, [allFilteredMovies, offset]);

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

  const hasMore = displayedMovies.length < totalCount;

  // SEO data
  const seoTitle = `${displayName} Movies - Films from ${displayName} | CineMatch`;
  const seoDescription = `Discover movies from ${displayName}. Browse ${totalCount} films produced in ${displayName}. Complete movie list with ratings and details on CineMatch.`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
    { name: displayName, url: `/country/${country}` },
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
          title={`Movies from ${displayName}`}
          breadcrumbs={[{ label: displayName, href: `/country/${country}` }]}
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
        title={`Movies from ${displayName}`}
        description="Production Country"
        breadcrumbs={[{ label: displayName, href: `/country/${country}` }]}
        movieCount={totalCount}
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
            <p className="text-muted-foreground">No movies found from {displayName}.</p>
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

export default CountryArchive;
