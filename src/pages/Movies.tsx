import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Movie } from "@/data/types";
import { FilterPanel } from "@/components/FilterPanel";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 48;

export default function Movies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Read all params from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortBy = searchParams.get("sortBy") || "rating";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  
  // Parse filters from URL
  const appliedGenres = useMemo(() => {
    const genresParam = searchParams.get("genres");
    return genresParam ? genresParam.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const appliedRatingRange = useMemo(() => {
    const ratingParam = searchParams.get("rating");
    if (!ratingParam) return [0, 10] as [number, number];
    const [min, max] = ratingParam.split("-").map(Number);
    return [min, max] as [number, number];
  }, [searchParams]);

  const appliedYearRange = useMemo(() => {
    const yearParam = searchParams.get("year");
    if (!yearParam) return [1900, 2030] as [number, number];
    const [min, max] = yearParam.split("-").map(Number);
    return [min, max] as [number, number];
  }, [searchParams]);

  const appliedSearchText = searchParams.get("search") || "";

  // Helper function to update URL params
  const updateUrlParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  // Fetch movies with filters, sorting, and pagination
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "movies",
      currentPage,
      sortBy,
      sortOrder,
      appliedGenres,
      appliedRatingRange,
      appliedYearRange,
      appliedSearchText,
    ],
    queryFn: async () => {
      let query = supabase.from("movies").select("*", { count: "exact" });

      // Apply filters
      if (appliedGenres.length > 0) {
        query = query.overlaps("genres", appliedGenres);
      }

      if (appliedRatingRange[0] > 0 || appliedRatingRange[1] < 10) {
        const minRating = appliedRatingRange[0];
        const maxRating = appliedRatingRange[1];
        query = query.or(
          `and(rating.gte.${minRating},rating.lte.${maxRating}),and(imdb_rating.gte.${minRating},imdb_rating.lte.${maxRating})`
        );
      }

      if (appliedYearRange[0] > 1900 || appliedYearRange[1] < 2030) {
        query = query
          .gte("year", appliedYearRange[0])
          .lte("year", appliedYearRange[1]);
      }

      if (appliedSearchText) {
        query = query.or(
          `title.ilike.%${appliedSearchText}%,actors.ilike.%${appliedSearchText}%,director.ilike.%${appliedSearchText}%`
        );
      }

      // Apply sorting
      if (sortBy === "user_rating" && user) {
        // Special handling for user ratings - need to fetch separately
        const { data: moviesData, error: moviesError, count } = await query;
        
        if (moviesError) throw moviesError;
        if (!moviesData) return { movies: [], totalCount: 0 };

        // Fetch user ratings for these movies
        const movieIds = moviesData.map((m) => m.id);
        const { data: ratingsData } = await supabase
          .from("user_ratings")
          .select("media_id, user_rating")
          .eq("user_id", user.id)
          .in("media_id", movieIds);

        // Merge ratings and sort
        const moviesWithRatings = moviesData.map((movie) => {
          const rating = ratingsData?.find((r) => r.media_id === movie.id);
          return {
            ...movie,
            genre: movie.genres,
            imdbId: movie.imdb_id,
            voteCount: movie.vote_count,
            originalLanguage: movie.original_language,
            productionCompanies: movie.production_companies,
            productionCountries: movie.production_countries,
            spokenLanguages: movie.spoken_languages,
            watchProviders: movie.watch_providers,
            imdbRating: movie.imdb_rating,
            imdbVotes: movie.imdb_votes,
            boxOffice: movie.box_office,
            dataSources: movie.data_sources as any,
            lastOmdbFetch: movie.last_omdb_fetch,
            userRating: rating?.user_rating || null,
          };
        });

        // Sort by user rating
        moviesWithRatings.sort((a, b) => {
          const ratingA = a.userRating || 0;
          const ratingB = b.userRating || 0;
          return sortOrder === "desc" ? ratingB - ratingA : ratingA - ratingB;
        });

        // Apply pagination after sorting
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const paginatedMovies = moviesWithRatings.slice(start, end);

        return {
          movies: paginatedMovies as Movie[],
          totalCount: count || 0,
        };
      } else {
        // Standard sorting
        const column = sortBy === "rating" ? "imdb_rating" : sortBy;
        query = query.order(column, { 
          ascending: sortOrder === "asc",
          nullsFirst: false 
        });

        // Apply pagination
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;
        query = query.range(start, end);

        const { data: moviesData, error: moviesError, count } = await query;
        
        if (moviesError) throw moviesError;

        // Map database fields to Movie type
        const mappedMovies = (moviesData || []).map((movie) => ({
          ...movie,
          genre: movie.genres,
          imdbId: movie.imdb_id,
          voteCount: movie.vote_count,
          originalLanguage: movie.original_language,
          productionCompanies: movie.production_companies,
          productionCountries: movie.production_countries,
          spokenLanguages: movie.spoken_languages,
          watchProviders: movie.watch_providers,
          imdbRating: movie.imdb_rating,
          imdbVotes: movie.imdb_votes,
          boxOffice: movie.box_office,
          dataSources: movie.data_sources as any,
          lastOmdbFetch: movie.last_omdb_fetch,
        }));

        return {
          movies: mappedMovies as Movie[],
          totalCount: count || 0,
        };
      }
    },
  });

  const movies = data?.movies || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch user ratings for displayed movies
  const { data: userRatingsData } = useQuery({
    queryKey: ["userRatings", movies.map((m) => m.id), user?.id],
    queryFn: async () => {
      if (!user || movies.length === 0) return [];
      
      const { data } = await supabase
        .from("user_ratings")
        .select("media_id, user_rating, in_watchlist")
        .eq("user_id", user.id)
        .in("media_id", movies.map((m) => m.id));
      
      return data || [];
    },
    enabled: !!user && movies.length > 0,
  });

  // Filter handlers
  const handleGenreToggle = (genre: string) => {
    const newGenres = appliedGenres.includes(genre)
      ? appliedGenres.filter((g) => g !== genre)
      : [...appliedGenres, genre];
    updateUrlParams({ genres: newGenres.join(","), page: "1" });
  };

  const handleRatingChange = (range: [number, number]) => {
    updateUrlParams({ rating: `${range[0]}-${range[1]}`, page: "1" });
  };

  const handleYearChange = (range: [number, number]) => {
    updateUrlParams({ year: `${range[0]}-${range[1]}`, page: "1" });
  };

  const handleSearchChange = (text: string) => {
    updateUrlParams({ search: text, page: "1" });
  };

  const handleResetFilters = () => {
    const newParams = new URLSearchParams();
    if (sortBy !== "rating") newParams.set("sortBy", sortBy);
    if (sortOrder !== "desc") newParams.set("sortOrder", sortOrder);
    setSearchParams(newParams, { replace: true });
  };

  // Sorting handler
  const handleSortChange = (newSortBy: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sortBy", newSortBy);
    
    // Auto-set sensible defaults for sort order
    if (newSortBy === "rating" || newSortBy === "user_rating") {
      newParams.set("sortOrder", "desc");
    } else if (newSortBy === "year") {
      newParams.set("sortOrder", "desc");
    } else if (newSortBy === "title") {
      newParams.set("sortOrder", "asc");
    }
    
    newParams.set("page", "1");
    setSearchParams(newParams, { replace: true });
  };

  // Pagination handler
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    updateUrlParams({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Modal handlers
  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  // Error handling
  if (error) {
    toast.error("Failed to load movies");
    console.error("Movies query error:", error);
  }

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    // Always show first page
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

    // Show ellipsis if needed
    if (showEllipsisStart) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
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

    // Show ellipsis if needed
    if (showEllipsisEnd) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
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
    <div className="container mx-auto px-4 py-8">
      {/* Filter Panel */}
      <div className="mb-8">
        <FilterPanel
          selectedGenres={appliedGenres}
          onGenreToggle={handleGenreToggle}
          ratingRange={appliedRatingRange}
          onRatingRangeChange={handleRatingChange}
          yearRange={appliedYearRange}
          onYearRangeChange={handleYearChange}
          searchText={appliedSearchText}
          onSearchTextChange={handleSearchChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Header: Title + Sorting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? "Loading..."
              : totalCount > 0
              ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  totalCount
                )} of ${totalCount} ${totalCount === 1 ? "movie" : "movies"}`
              : "No movies found"}
          </p>
        </div>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            {user && <SelectItem value="user_rating">My Rating</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Movie Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Unable to load movies. Please try again.
          </p>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No movies found matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              {...movie}
              onOpenDetail={handleOpenDetail}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationPrevious
              onClick={() => goToPage(currentPage - 1)}
              className={
                currentPage === 1 ? "pointer-events-none opacity-50" : ""
              }
            />
            {renderPaginationItems()}
            <PaginationNext
              onClick={() => goToPage(currentPage + 1)}
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            />
          </PaginationContent>
        </Pagination>
      )}

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movieId={selectedMovieId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
