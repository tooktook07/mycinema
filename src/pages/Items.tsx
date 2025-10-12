import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { FilterPanel } from "@/components/FilterPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 48;

const Items = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { loading: authLoading } = useAuth();
  
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Parse filter parameters from URL
  const appliedGenres = useMemo(() => {
    const genresParam = searchParams.get("genres");
    return genresParam ? genresParam.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const appliedRatingRange = useMemo((): [number, number] => {
    const ratingParam = searchParams.get("rating");
    if (!ratingParam) return [0, 10];
    const [min, max] = ratingParam.split("-").map(Number);
    return [min, max];
  }, [searchParams]);

  const appliedYearRange = useMemo((): [number, number] => {
    const yearParam = searchParams.get("year");
    if (!yearParam) return [1900, new Date().getFullYear()];
    const [min, max] = yearParam.split("-").map(Number);
    return [min, max];
  }, [searchParams]);

  const appliedSearchText = useMemo(() => {
    return searchParams.get("search") || "";
  }, [searchParams]);

  // Helper to update URL params
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset to page 1 when filters change
    if (Object.keys(updates).some(key => key !== "page")) {
      newParams.set("page", "1");
    }
    setSearchParams(newParams);
  };

  // Filter handlers
  const handleGenreToggle = (genre: string) => {
    const newGenres = appliedGenres.includes(genre)
      ? appliedGenres.filter((g) => g !== genre)
      : [...appliedGenres, genre];
    updateUrlParams({ genres: newGenres.length > 0 ? newGenres.join(",") : null });
  };

  const handleRatingRangeChange = (range: [number, number]) => {
    updateUrlParams({ rating: `${range[0]}-${range[1]}` });
  };

  const handleYearRangeChange = (range: [number, number]) => {
    updateUrlParams({ year: `${range[0]}-${range[1]}` });
  };

  const handleSearchTextChange = (text: string) => {
    updateUrlParams({ search: text || null });
  };

  const handleResetFilters = () => {
    setSearchParams({ page: "1" });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", currentPage, appliedGenres, appliedRatingRange, appliedYearRange, appliedSearchText],
    enabled: !authLoading,
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("movies")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply genre filter
      if (appliedGenres.length > 0) {
        query = query.overlaps("genres", appliedGenres);
      }

      // Apply rating filter only if not default values
      const hasRatingFilter = appliedRatingRange[0] !== 0 || appliedRatingRange[1] !== 10;
      if (hasRatingFilter) {
        query = query.or(
          `rating.gte.${appliedRatingRange[0]},rating.lte.${appliedRatingRange[1]},imdb_rating.gte.${appliedRatingRange[0]},imdb_rating.lte.${appliedRatingRange[1]}`
        );
      }

      // Apply year filter only if not default values
      const currentYear = new Date().getFullYear();
      const hasYearFilter = appliedYearRange[0] !== 1900 || appliedYearRange[1] !== currentYear;
      if (hasYearFilter) {
        query = query.gte("year", appliedYearRange[0]).lte("year", appliedYearRange[1]);
      }

      // Apply search filter
      if (appliedSearchText) {
        const searchPattern = `%${appliedSearchText}%`;
        query = query.or(
          `title.ilike.${searchPattern},actors.ilike.${searchPattern},director.ilike.${searchPattern}`
        );
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { movies: data, totalCount: count || 0 };
    },
  });

  const movies = data?.movies || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => goToPage(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => goToPage(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <FilterPanel
            selectedGenres={appliedGenres}
            onGenreToggle={handleGenreToggle}
            ratingRange={appliedRatingRange}
            onRatingRangeChange={handleRatingRangeChange}
            yearRange={appliedYearRange}
            onYearRangeChange={handleYearRangeChange}
            searchText={appliedSearchText}
            onSearchTextChange={handleSearchTextChange}
            onReset={handleResetFilters}
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">All Items</h1>
          <p className="text-muted-foreground">
            {totalCount} {totalCount === 1 ? "movie" : "movies"}
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 48 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-8 text-center">
            <p className="text-destructive">Error loading items: {error.message}</p>
          </Card>
        )}

        {!isLoading && movies.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No items found</p>
          </Card>
        )}

        {movies.length > 0 && (
          <>
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
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        movieId={selectedMovieId}
        onNavigateToMovie={handleOpenDetail}
      />
    </div>
  );
};

export default Items;
