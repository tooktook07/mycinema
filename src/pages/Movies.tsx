import { useState, useMemo } from "react";
import { Film, Grid, Table as TableIcon } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { FilterPanel } from "@/components/FilterPanel";
import { MoviesTable } from "@/components/MoviesTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@/data/types";

const Movies = () => {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"rating" | "year" | "title">("rating");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Temporary filter states
  const [tempGenres, setTempGenres] = useState<string[]>([]);
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, 10]);
  const [tempYearRange, setTempYearRange] = useState<[number, number]>([1900, 2030]);
  const [tempLanguage, setTempLanguage] = useState<string>("");

  // Applied filter states
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedRatingRange, setAppliedRatingRange] = useState<[number, number]>([0, 10]);
  const [appliedYearRange, setAppliedYearRange] = useState<[number, number]>([1900, 2030]);
  const [appliedLanguage, setAppliedLanguage] = useState<string>("");

  const handleGenreToggle = (genre: string) => {
    setTempGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleApplyFilters = () => {
    setAppliedGenres(tempGenres);
    setAppliedRatingRange(tempRatingRange);
    setAppliedYearRange(tempYearRange);
    setAppliedLanguage(tempLanguage);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setTempGenres([]);
    setTempRatingRange([0, 10]);
    setTempYearRange([1900, 2030]);
    setTempLanguage("");
    setAppliedGenres([]);
    setAppliedRatingRange([0, 10]);
    setAppliedYearRange([1900, 2030]);
    setAppliedLanguage("");
    setCurrentPage(1);
  };

  const handleYearClick = (year: number) => {
    setTempYearRange([year, year]);
    setAppliedYearRange([year, year]);
    setCurrentPage(1);
  };

  const handleGenreClick = (genre: string) => {
    const newGenres = [genre];
    setTempGenres(newGenres);
    setAppliedGenres(newGenres);
    setCurrentPage(1);
  };

  const handleLanguageClick = (language: string) => {
    setTempLanguage(language);
    setAppliedLanguage(language);
    setCurrentPage(1);
  };

  // Fetch movies with filters, pagination, and sorting
  const { data: moviesData, isLoading, error } = useQuery({
    queryKey: ["movies", appliedGenres, appliedRatingRange, appliedYearRange, appliedLanguage, currentPage, sortBy, sortOrder, itemsPerPage],
    queryFn: async () => {
      let query = supabase
        .from("movies")
        .select("*", { count: "exact" });

      // Apply filters
      if (appliedGenres.length > 0) {
        query = query.overlaps("genres", appliedGenres);
      }
      if (appliedRatingRange[0] > 0 || appliedRatingRange[1] < 10) {
        query = query.gte("rating", appliedRatingRange[0]).lte("rating", appliedRatingRange[1]);
      }
      query = query.gte("year", appliedYearRange[0]).lte("year", appliedYearRange[1]);
      if (appliedLanguage) {
        query = query.eq("original_language", appliedLanguage.toLowerCase());
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        movies: (data || []).map((movie): Movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          rating: movie.rating || 0,
          genre: movie.genres || [],
          poster: movie.poster || "",
          plot: movie.plot || "",
          director: movie.director || "",
          actors: movie.actors || "",
          runtime: movie.runtime || "",
          imdbId: movie.imdb_id,
          voteCount: movie.vote_count || 0,
          originalLanguage: movie.original_language || "",
        })),
        totalCount: count || 0,
      };
    },
  });

  const movies = moviesData?.movies || [];
  const totalCount = moviesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSortChange = (value: string) => {
    const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => setCurrentPage(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext 
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel
            selectedGenres={tempGenres}
            onGenreToggle={handleGenreToggle}
            ratingRange={tempRatingRange}
            onRatingRangeChange={setTempRatingRange}
            yearRange={tempYearRange}
            onYearRangeChange={setTempYearRange}
            selectedLanguage={tempLanguage}
            onLanguageChange={setTempLanguage}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Results */}
        <main>
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Recommended Movies</h2>
              <p className="text-muted-foreground">
                {isLoading ? "Loading..." : `${totalCount} ${totalCount === 1 ? "result" : "results"} found`}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating-desc">Rating (High to Low)</SelectItem>
                  <SelectItem value="rating-asc">Rating (Low to High)</SelectItem>
                  <SelectItem value="year-desc">Year (Newest First)</SelectItem>
                  <SelectItem value="year-asc">Year (Oldest First)</SelectItem>
                  <SelectItem value="title-asc">Title (A to Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z to A)</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="200">200 per page</SelectItem>
                </SelectContent>
              </Select>
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

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-[400px] rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Error loading movies</h3>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again later"}
              </p>
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to discover more content
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {movies.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    {...movie} 
                    onYearClick={handleYearClick}
                    onGenreClick={handleGenreClick}
                    onLanguageClick={handleLanguageClick}
                  />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <>
              <MoviesTable movies={movies} title="Movies" />
              {renderPagination()}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Movies;
