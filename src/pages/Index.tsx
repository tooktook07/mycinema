import { useState, useMemo } from "react";
import { Film } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { FilterPanel } from "@/components/FilterPanel";
import { mockMovies } from "@/data/mockMovies";

const Index = () => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2024]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const filteredMovies = useMemo(() => {
    return mockMovies.filter((movie) => {
      const matchesGenre =
        selectedGenres.length === 0 || movie.genre.some((g) => selectedGenres.includes(g));
      const matchesRating = movie.rating >= minRating;
      const matchesYear = movie.year >= yearRange[0] && movie.year <= yearRange[1];

      return matchesGenre && matchesRating && matchesYear;
    });
  }, [selectedGenres, minRating, yearRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Hero Section */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/20 via-background to-primary/20 px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-bold text-foreground md:text-5xl">CineMatch</h1>
          </div>
          <p className="text-center text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover your next favorite movie or series based on IMDB ratings, genres, and release dates
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Filters */}
          <aside>
            <FilterPanel
              selectedGenres={selectedGenres}
              onGenreToggle={handleGenreToggle}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              yearRange={yearRange}
              onYearRangeChange={setYearRange}
            />
          </aside>

          {/* Results */}
          <main>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Recommended for You
              </h2>
              <p className="text-muted-foreground">
                {filteredMovies.length} {filteredMovies.length === 1 ? "result" : "results"} found
              </p>
            </div>

            {filteredMovies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters to discover more content
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {filteredMovies.map((movie) => (
                  <MovieCard key={movie.id} {...movie} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Index;
