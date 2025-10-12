import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const Items = () => {
  const { data: movies, isLoading, error } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">All Items</h1>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading items: {error.message}</p>
          </Card>
        )}

        {movies && movies.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No items found</p>
          </Card>
        )}

        {movies && movies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                rating={movie.rating || 0}
                year={movie.year}
                genre={movie.genres || []}
                poster={movie.poster || ""}
                local_poster_url={movie.local_poster_url}
                imdbId={movie.imdb_id}
                plot={movie.plot}
                director={movie.director}
                actors={movie.actors}
                runtime={movie.runtime}
                imdbRating={movie.imdb_rating}
                imdbVotes={movie.imdb_votes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Items;
