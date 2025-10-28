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

const StreamingArchive = () => {
  const { provider } = useParams<{ provider: string }>();
  const decodedProvider = provider ? decodeArchiveSlug(provider) : "";
  const displayName = toTitleCase(decodedProvider);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [allFilteredMovies, setAllFilteredMovies] = useState<any[]>([]);

  // Fetch all movies with watch providers and filter client-side
  const { data, isLoading, isFetched, isPlaceholderData } = useQuery({
    queryKey: ["streamingMovies", decodedProvider, offset],
    queryFn: async () => {
      // Fetch all movies that have watch_providers
      const { data: allMovies, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, watch_providers")
        .not("watch_providers", "is", null)
        .order("imdb_rating", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Filter client-side for case-insensitive match in watch providers
      const filtered = (allMovies || []).filter((movie) => {
        if (!movie.watch_providers) return false;
        
        const providers = movie.watch_providers as any;
        if (typeof providers !== 'object') return false;
        
        const regions = providers.results || providers;
        if (typeof regions !== 'object') return false;
        
        // Check US, GB, or first available region
        const region = regions["US"] || regions["GB"] || Object.values(regions)[0];
        if (!region || typeof region !== "object") return false;
        
        // Check all provider types (flatrate, rent, buy)
        const allProviders = [
          ...((region as any).flatrate || []),
          ...((region as any).rent || []),
          ...((region as any).buy || [])
        ];
        
        return allProviders.some((prov: any) => {
          const providerName = prov.provider_name || prov;
          return providerName.toLowerCase() === decodedProvider.toLowerCase();
        });
      });

      return { movies: filtered, hasMore: false };
    },
    enabled: !!decodedProvider,
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
  const seoTitle = `${displayName} Movies - Watch on ${displayName} | CineMatch`;
  const seoDescription = `Discover movies available on ${displayName}. Browse ${totalCount} films you can stream, rent, or buy on ${displayName}. Complete movie list with ratings and details on CineMatch.`;
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
    { name: displayName, url: `/streaming/${provider}` },
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
          title={`Watch on ${displayName}`}
          breadcrumbs={[{ label: displayName, href: `/streaming/${provider}` }]}
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
        title={`Watch on ${displayName}`}
        description="Streaming Service"
        breadcrumbs={[{ label: displayName, href: `/streaming/${provider}` }]}
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
            <p className="text-muted-foreground">No movies found on {displayName}.</p>
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

export default StreamingArchive;
