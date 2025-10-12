import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArchiveLayout } from "@/components/ArchiveLayout";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { decodeArchiveSlug, toTitleCase } from "@/lib/urlUtils";

const PersonArchive = () => {
  const { personName } = useParams<{ personName: string }>();
  const decodedPersonName = personName ? decodeArchiveSlug(personName) : "";
  const displayName = toTitleCase(decodedPersonName);
  
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["personMovies", decodedPersonName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .or(`director.ilike.%${decodedPersonName}%,actors.ilike.%${decodedPersonName}%,writing.ilike.%${decodedPersonName}%`)
        .order("year", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!decodedPersonName,
  });

  // Categorize movies by role
  const directorMovies = movies?.filter(m => m.director?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];
  const actorMovies = movies?.filter(m => m.actors?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];
  const writerMovies = movies?.filter(m => m.writing?.toLowerCase().includes(decodedPersonName.toLowerCase())) || [];

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleNavigateToMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
  };

  const renderMovieGrid = (moviesList: any[]) => {
    if (moviesList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No movies found for this role.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

  if (isLoading) {
    return (
      <ArchiveLayout
        title={displayName}
        breadcrumbs={[{ label: displayName, href: `/person/${personName}` }]}
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
        movieCount={movies?.length || 0}
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
