import { useState, useEffect } from "react";
import { Film, Grid, Table as TableIcon } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { FilterPanel } from "@/components/FilterPanel";
import { MoviesTable } from "@/components/MoviesTable";
import { QuickFilterChips } from "@/components/QuickFilterChips";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@/data/types";
import { useFilters } from "@/contexts/FilterContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const Movies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("[Movies] Component mounted on route:", window.location.pathname);
    return () => {
      console.log("[Movies] Component unmounting");
    };
  }, []);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"rating" | "year" | "title" | "user_rating">("rating");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState(50); // Optimized: reduced from 100

  // Filter states from context
  const {
    appliedGenres,
    setAppliedGenres,
    appliedRatingRange,
    setAppliedRatingRange,
    appliedYearRange,
    setAppliedYearRange,
    appliedLanguages,
    setAppliedLanguages,
    appliedSearchText,
    setAppliedSearchText,
    resetFilters
  } = useFilters();
  const handleGenreToggle = (genre: string) => {
    setAppliedGenres(appliedGenres.includes(genre) ? appliedGenres.filter(g => g !== genre) : [...appliedGenres, genre]);
    setCurrentPage(1);
  };
  const handleLanguageToggle = (language: string) => {
    setAppliedLanguages(appliedLanguages.includes(language) ? appliedLanguages.filter(l => l !== language) : [...appliedLanguages, language]);
    setCurrentPage(1);
  };
  const handleResetFilters = () => {
    resetFilters();
    setCurrentPage(1);
  };
  const handleYearClick = (year: number) => {
    setAppliedYearRange([year, year]);
    setCurrentPage(1);
  };
  const handleGenreClick = (genre: string) => {
    setAppliedGenres([genre]);
    setCurrentPage(1);
  };
  const handleLanguageClick = (language: string) => {
    setAppliedLanguages([language]);
    setCurrentPage(1);
  };
  const handleActorClick = (actor: string) => {
    setAppliedSearchText(actor);
    setCurrentPage(1);
  };
  const handleDirectorClick = (director: string) => {
    setAppliedSearchText(director);
    setCurrentPage(1);
  };
  const handleWriterClick = (writer: string) => {
    setAppliedSearchText(writer);
    setCurrentPage(1);
  };
  const handleKeywordClick = (keyword: string) => {
    setAppliedSearchText(keyword);
    setCurrentPage(1);
  };

  const handleOpenDetail = (movieId: string) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  const handleNavigateToMovie = (newMovieId: string) => {
    setSelectedMovieId(newMovieId);
  };


  // Fetch movies with filters, pagination, and sorting
  const {
    data: moviesData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ["movies", appliedGenres, appliedRatingRange, appliedYearRange, appliedLanguages, appliedSearchText, currentPage, sortBy, sortOrder, itemsPerPage],
    queryFn: async () => {
      console.log("[Movies Query] Starting fetch with filters:", {
        genres: appliedGenres,
        rating: appliedRatingRange,
        year: appliedYearRange,
        languages: appliedLanguages,
        search: appliedSearchText,
        page: currentPage,
        sortBy,
        sortOrder
      });
      // Get current user for user_rating sorting
      const { data: { user } } = await supabase.auth.getUser();
      
      // For user rating sort, we need a different query structure
      if (sortBy === "user_rating" && user) {
        let query = supabase
          .from("movies")
          .select(`
            *,
            user_ratings!inner(user_rating)
          `, {
            count: "exact"
          })
          .eq('user_ratings.user_id', user.id)
          .eq('user_ratings.media_type', 'movie');

        // Apply filters
        if (appliedGenres.length > 0) {
          query = query.overlaps("genres", appliedGenres);
        }
      if (appliedRatingRange[0] > 0 || appliedRatingRange[1] < 10) {
        // Optimized: Simpler rating filter using indexes
        const [min, max] = appliedRatingRange;
        query = query.or(`imdb_rating.gte.${min},and(imdb_rating.is.null,rating.gte.${min})`);
        query = query.or(`imdb_rating.lte.${max},and(imdb_rating.is.null,rating.lte.${max})`);
      }
        query = query.gte("year", appliedYearRange[0]).lte("year", appliedYearRange[1]);
        if (appliedLanguages.length > 0) {
          query = query.in("original_language", appliedLanguages);
        }

        // Apply text search across multiple fields
        if (appliedSearchText) {
          query = query.or(`title.ilike.%${appliedSearchText}%,actors.ilike.%${appliedSearchText}%,director.ilike.%${appliedSearchText}%,writing.ilike.%${appliedSearchText}%,keywords.cs.{${appliedSearchText}}`);
        }

        // Sort by user_rating
        query = query.order('user_rating', {
          ascending: sortOrder === "asc",
          foreignTable: 'user_ratings'
        });

        // Apply pagination
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) {
          console.error("[Movies Query] Error fetching with user_rating:", error);
          throw error;
        }
        
        console.log("[Movies Query] Success with user_rating - found", count, "movies");
        return {
          movies: (data || []).map((movie: any): Movie => ({
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
            writing: movie.writing || "",
            sound: movie.sound || "",
            keywords: movie.keywords || []
          })),
          totalCount: count || 0
        };
      }

      // Standard query for other sorting options
      let query = supabase.from("movies").select("*", {
        count: "exact"
      });

      // Apply filters
      if (appliedGenres.length > 0) {
        query = query.overlaps("genres", appliedGenres);
      }
      if (appliedRatingRange[0] > 0 || appliedRatingRange[1] < 10) {
        // Optimized: Simpler rating filter using indexes
        const [min, max] = appliedRatingRange;
        query = query.or(`imdb_rating.gte.${min},and(imdb_rating.is.null,rating.gte.${min})`);
        query = query.or(`imdb_rating.lte.${max},and(imdb_rating.is.null,rating.lte.${max})`);
      }
      query = query.gte("year", appliedYearRange[0]).lte("year", appliedYearRange[1]);
      if (appliedLanguages.length > 0) {
        query = query.in("original_language", appliedLanguages);
      }

      // Apply text search across multiple fields
      if (appliedSearchText) {
        query = query.or(`title.ilike.%${appliedSearchText}%,actors.ilike.%${appliedSearchText}%,director.ilike.%${appliedSearchText}%,writing.ilike.%${appliedSearchText}%,keywords.cs.{${appliedSearchText}}`);
      }

      // Apply sorting - prioritize IMDb rating for rating sorts
      if (sortBy === 'rating') {
        // Sort by IMDb rating when available, then by TMDB rating
        query = query.order('imdb_rating', { ascending: sortOrder === "asc", nullsFirst: false });
        query = query.order('rating', { ascending: sortOrder === "asc" });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === "asc" });
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      const {
        data,
        error,
        count
      } = await query;
      if (error) {
        console.error("[Movies Query] Error fetching movies:", error);
        throw error;
      }
      
      console.log("[Movies Query] Success - found", count, "movies");
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
          writing: movie.writing || "",
          sound: movie.sound || "",
          keywords: movie.keywords || [],
          imdbRating: movie.imdb_rating || undefined,
          imdbVotes: movie.imdb_votes || undefined,
          metascore: movie.metascore || undefined
        })),
        totalCount: count || 0
      };
    },
    staleTime: 60000, // 1 minute - optimized caching
    gcTime: 300000, // 5 minutes cache time
  });
  const movies = moviesData?.movies || [];
  const totalCount = moviesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Batch fetch user data for all displayed movies (N+1 query fix)
  const { data: userDataMap = {} } = useQuery({
    queryKey: ["batch-user-data", movies.map(m => m.id), user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const movieIds = movies.map(m => m.id);
      if (movieIds.length === 0) return {};

      const { data } = await supabase
        .from("user_ratings")
        .select("media_id, user_rating, in_watchlist")
        .eq("user_id", user.id)
        .eq("media_type", "movie")
        .in("media_id", movieIds);
      
      // Create lookup map
      const map: Record<string, { rating: number | null, inWatchlist: boolean }> = {};
      data?.forEach(item => {
        map[item.media_id] = {
          rating: item.user_rating,
          inWatchlist: item.in_watchlist || false
        };
      });
      
      return map;
    },
    enabled: !!user?.id && movies.length > 0,
    staleTime: 30000, // 30 seconds
  });

  // Debug query states
  useEffect(() => {
    console.log("[Movies] Query state:", { isLoading, isError, error, totalCount, moviesCount: movies.length });
  }, [isLoading, isError, error, totalCount, movies.length]);
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
    return <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
          </PaginationItem>
          
          {startPage > 1 && <>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>}
            </>}

          {pages.map(page => <PaginationItem key={page}>
              <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                {page}
              </PaginationLink>
            </PaginationItem>)}

          {endPage < totalPages && <>
              {endPage < totalPages - 1 && <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>}
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>}

          <PaginationItem>
            <PaginationNext onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>;
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Quick Filter Chips */}
        <QuickFilterChips
          onGenreClick={(genre) => {
            handleGenreToggle(genre);
          }}
          onYearClick={(start, end) => {
            setAppliedYearRange([start, end]);
            setCurrentPage(1);
          }}
          onRatingClick={(min, max) => {
            setAppliedRatingRange([min, max]);
            setCurrentPage(1);
          }}
        />
        
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel selectedGenres={appliedGenres} onGenreToggle={handleGenreToggle} ratingRange={appliedRatingRange} onRatingRangeChange={range => {
          setAppliedRatingRange(range);
          setCurrentPage(1);
        }} yearRange={appliedYearRange} onYearRangeChange={range => {
          setAppliedYearRange(range);
          setCurrentPage(1);
        }} selectedLanguages={appliedLanguages} onLanguageToggle={handleLanguageToggle} searchText={appliedSearchText} onSearchTextChange={text => {
          setAppliedSearchText(text);
          setCurrentPage(1);
        }} onReset={handleResetFilters} />
        </div>

        {/* Results */}
        <main>
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Movies</h2>
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
                  <SelectItem value="user_rating-desc">My Rating (High to Low)</SelectItem>
                  <SelectItem value="user_rating-asc">My Rating (Low to High)</SelectItem>
                  <SelectItem value="year-desc">Year (Newest First)</SelectItem>
                  <SelectItem value="year-asc">Year (Oldest First)</SelectItem>
                  <SelectItem value="title-asc">Title (A to Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z to A)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={itemsPerPage.toString()} onValueChange={value => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="200">200 per page</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                <Grid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {isLoading ? <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[400px] rounded-lg" />)}
            </div> : error ? <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Error loading movies</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Please try again later"}
              </p>
              <p className="text-sm text-muted-foreground">
                Check the browser console for more details
              </p>
            </div> : movies.length === 0 && totalCount === 0 && appliedGenres.length === 0 && appliedSearchText === "" ? <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No movies in database</h3>
              <p className="text-muted-foreground mb-4">
                The movie database is empty. Please sync movies from TMDB first.
              </p>
              <Button onClick={() => window.location.href = "/account"}>
                Go to Sync Settings
              </Button>
            </div> : movies.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center">
              <Film className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to discover more content
              </p>
            </div> : viewMode === "grid" ? <>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {movies.map((movie, index) => {
                  const userData = userDataMap[movie.id];
                  return (
                    <MovieCard
                      key={movie.id}
                      {...movie}
                      preloadedUserRating={userData?.rating}
                      preloadedInWatchlist={userData?.inWatchlist}
                      onYearClick={handleYearClick}
                      onGenreClick={handleGenreClick}
                      onLanguageClick={handleLanguageClick}
                      onActorClick={handleActorClick}
                      onDirectorClick={handleDirectorClick}
                      onWriterClick={handleWriterClick}
                      onKeywordClick={handleKeywordClick}
                      onOpenDetail={handleOpenDetail}
                    />
                  );
                })}
              </div>
              {renderPagination()}
            </> : <>
              <MoviesTable movies={movies} title="Movies" onOpenDetail={handleOpenDetail} />
              {renderPagination()}
            </>}
        </main>
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        movieId={selectedMovieId}
        onNavigateToMovie={handleNavigateToMovie}
      />
    </div>;
};
export default Movies;