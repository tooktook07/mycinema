import { useState, useMemo } from "react";
import { Tv, Grid, Table as TableIcon } from "lucide-react";
import { TvShowCard } from "@/components/TvShowCard";
import { FilterPanel } from "@/components/FilterPanel";
import { TvShowsTable } from "@/components/TvShowsTable";
import { mockTvShows } from "@/data/mockTvShows";
import { Button } from "@/components/ui/button";

const TvShows = () => {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter states
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedRatingRange, setAppliedRatingRange] = useState<[number, number]>([0, 10]);
  const [appliedYearRange, setAppliedYearRange] = useState<[number, number]>([1900, 2030]);
  const [appliedLanguages, setAppliedLanguages] = useState<string[]>([]);

  const handleGenreToggle = (genre: string) => {
    setAppliedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleLanguageToggle = (language: string) => {
    setAppliedLanguages((prev) =>
      prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]
    );
  };

  const handleResetFilters = () => {
    setAppliedGenres([]);
    setAppliedRatingRange([0, 10]);
    setAppliedYearRange([1900, 2030]);
    setAppliedLanguages([]);
  };

  const filteredShows = useMemo(() => {
    return mockTvShows.filter((show) => {
      const matchesGenre =
        appliedGenres.length === 0 || show.genre.some((g) => appliedGenres.includes(g));
      const matchesRating = show.rating >= appliedRatingRange[0] && show.rating <= appliedRatingRange[1];
      const matchesYear =
        show.startYear >= appliedYearRange[0] &&
        show.startYear <= appliedYearRange[1];

      return matchesGenre && matchesRating && matchesYear;
    });
  }, [appliedGenres, appliedRatingRange, appliedYearRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel
            selectedGenres={appliedGenres}
            onGenreToggle={handleGenreToggle}
            ratingRange={appliedRatingRange}
            onRatingRangeChange={setAppliedRatingRange}
            yearRange={appliedYearRange}
            onYearRangeChange={setAppliedYearRange}
            selectedLanguages={appliedLanguages}
            onLanguageToggle={handleLanguageToggle}
            onReset={handleResetFilters}
          />
        </div>

        {/* Results */}
        <main>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Recommended TV Shows</h2>
              <p className="text-muted-foreground">
                {filteredShows.length} {filteredShows.length === 1 ? "result" : "results"} found
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {filteredShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Tv className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to discover more content
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredShows.map((show) => (
                <TvShowCard key={show.id} {...show} />
              ))}
            </div>
          ) : (
            <TvShowsTable shows={filteredShows} title="TV Shows" />
          )}
        </main>
      </div>
    </div>
  );
};

export default TvShows;
