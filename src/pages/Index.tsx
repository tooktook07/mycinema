import { useState, useMemo } from "react";
import { Film } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { FilterPanel } from "@/components/FilterPanel";
import { mockMovies } from "@/data/mockMovies";

const Index = () => {
  // Temporary filter states (updated as user changes controls)
  const [tempGenres, setTempGenres] = useState<string[]>([]);
  const [tempMinRating, setTempMinRating] = useState(0);
  const [tempYearRange, setTempYearRange] = useState<[number, number]>([1900, 2024]);

  // Applied filter states (only updated when Apply is clicked)
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedMinRating, setAppliedMinRating] = useState(0);
  const [appliedYearRange, setAppliedYearRange] = useState<[number, number]>([1900, 2024]);

  const handleGenreToggle = (genre: string) => {
    setTempGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleApplyFilters = () => {
    setAppliedGenres(tempGenres);
    setAppliedMinRating(tempMinRating);
    setAppliedYearRange(tempYearRange);
  };

  const handleResetFilters = () => {
    setTempGenres([]);
    setTempMinRating(0);
    setTempYearRange([1900, 2024]);
    setAppliedGenres([]);
    setAppliedMinRating(0);
    setAppliedYearRange([1900, 2024]);
  };

  const filteredMovies = useMemo(() => {
    return mockMovies.filter((movie) => {
      const matchesGenre =
        appliedGenres.length === 0 || movie.genre.some((g) => appliedGenres.includes(g));
      const matchesRating = movie.rating >= appliedMinRating;
      const matchesYear = movie.year >= appliedYearRange[0] && movie.year <= appliedYearRange[1];

      return matchesGenre && matchesRating && matchesYear;
    });
  }, [appliedGenres, appliedMinRating, appliedYearRange]);

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
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel
            selectedGenres={tempGenres}
            onGenreToggle={handleGenreToggle}
            minRating={tempMinRating}
            onMinRatingChange={setTempMinRating}
            yearRange={tempYearRange}
            onYearRangeChange={setTempYearRange}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </div>

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
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredMovies.map((movie) => (
                  <MovieCard key={movie.id} {...movie} />
                ))}
              </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default Index;
