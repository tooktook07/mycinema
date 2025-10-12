import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const MOVIES_PER_PAGE = 48;

const PersonArchive = () => {
  const { personName } = useParams<{ personName: string }>();
  const decodedPersonName = personName ? decodeArchiveSlug(personName) : "";
  const displayName = toTitleCase(decodedPersonName);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedMovies, setDisplayedMovies] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetched, isPlaceholderData } = useQuery({
    queryKey: ["personMovies", decodedPersonName, offset],
    queryFn: async () => {
      const from = offset;
      const to = from + MOVIES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("movies")
        .select("id, title, year, rating, imdb_rating, imdb_votes, genres, poster, local_poster_url, imdb_id, director, actors, writing")
        .or(`director.ilike.%${decodedPersonName}%,actors.ilike.%${decodedPersonName}%,writing.ilike.%${decodedPersonName}%`)
        .order("year", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const hasMore = data?.length === MOVIES_PER_PAGE;
      return { movies: data || [], hasMore };
    },
    enabled: !!decodedPersonName,
    placeholderData: (previousData) => previousData,
  });

  // Get total count
  const { data: countData } = useQuery({
    queryKey: ["personMoviesCount", decodedPersonName],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true })
        .or(`director.ilike.%${decodedPersonName}%,actors.ilike.%${decodedPersonName}%,writing.ilike.%${decodedPersonName}%`);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!decodedPersonName,
    staleTime: 60000,
  });

  useEffect(() => {
    if (data?.movies && !isPlaceholderData) {
      setDisplayedMovies(prev => offset === 0 ? data.movies : [...prev, ...data.movies]);
    }
  }, [data?.movies, offset, isPlaceholderData]);

  // Categorize movies by role
  const directorMovies = displayedMovies?.filter(m => m.director?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];
  const actorMovies = displayedMovies?.filter(m => m.actors?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];
  const writerMovies = displayedMovies?.filter(m => m.writing?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];

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

  const renderMovieGrid = (moviesList: any[]) => {
    if (moviesList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No movies found for this role.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {moviesList.map((movie) => (
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
    );
  };

  if ((isLoading || !isFetched) && offset === 0) {
    return (
      <ArchiveLayout
        title={displayName}
        breadcrumbs={[{ label: displayName, href: `/person/${personName}` }]}
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

  // Determine which tabs to show
  const hasDirector = directorMovies.length > 0;
  const hasActor = actorMovies.length > 0;
  const hasWriter = writerMovies.length > 0;
  const defaultTab = hasDirector ? "director" : hasActor ? "actor" : "writer";

  return (
    <>
      <ArchiveLayout
        title={displayName}
        description="Filmography"
        breadcrumbs={[{ label: displayName, href: `/person/${personName}` }]}
        movieCount={countData || displayedMovies.length}
      >
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6">
            {hasDirector && (
              <TabsTrigger value="director">
                As Director ({directorMovies.length})
              </TabsTrigger>
            )}
            {hasActor && (
              <TabsTrigger value="actor">
                As Actor ({actorMovies.length})
              </TabsTrigger>
            )}
            {hasWriter && (
              <TabsTrigger value="writer">
                As Writer ({writerMovies.length})
              </TabsTrigger>
            )}
          </TabsList>

          {hasDirector && (
            <TabsContent value="director">
              {renderMovieGrid(directorMovies)}
            </TabsContent>
          )}

          {hasActor && (
            <TabsContent value="actor">
              {renderMovieGrid(actorMovies)}
            </TabsContent>
          )}

          {hasWriter && (
            <TabsContent value="writer">
              {renderMovieGrid(writerMovies)}
            </TabsContent>
          )}
        </Tabs>

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

export default PersonArchive;
