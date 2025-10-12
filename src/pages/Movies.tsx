import { useState, useEffect, useRef, useMemo } from "react";
import { Film, Grid, Table as TableIcon } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetailModal } from "@/components/MovieDetailModal";
import { FilterPanel } from "@/components/FilterPanel";
import { MoviesTable } from "@/components/MoviesTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@/data/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

const Movies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load more state
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMovies, setHasMoreMovies] = useState(true);

  // Debug logging
  useEffect(() => {
    console.log("[Movies] Component mounted on route:", window.location.pathname);
    return () => {
      console.log("[Movies] Component unmounting");
    };
  }, []);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  // Track current page for load more (not in URL)
  const [currentPage, setCurrentPage] = useState(1);
  
  // Derive sortBy and sortOrder from URL (single source of truth)
  const sortBy = (() => {
    const sortByParam = searchParams.get('sortBy');
    if (sortByParam && ['rating', 'year', 'title', 'user_rating', 'random'].includes(sortByParam)) {
      return sortByParam as "rating" | "year" | "title" | "user_rating" | "random";
    }
    // Default to random for new users, rating for returning users
    const hasVisited = localStorage.getItem('movies_has_visited');
    if (!hasVisited) {
      localStorage.setItem('movies_has_visited', 'true');
      return 'random';
    }
    return 'random'; // Use URL default from FilterContext
  })();
  
  const sortOrder = (() => {
    const sortOrderParam = searchParams.get('sortOrder');
    return (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'desc';
  })();
  
  const [itemsPerPage, setItemsPerPage] = useState(20); // Start with 20 items for faster initial load

  // Auto-reset sort to "rating" if user logs out while "My Rating" is selected
  useEffect(() => {
    if (!user && sortBy === "user_rating") {
      console.log("[Movies] User logged out with user_rating sort active - resetting to rating");
      const newParams = new URLSearchParams(searchParams);
      newParams.set('sortBy', 'rating');
      newParams.set('sortOrder', 'desc');
      setSearchParams(newParams, { replace: true });
    }
  }, [user, sortBy]);

  // Convert URL params to stable string for memoization - prevents race conditions
  const searchParamsString = searchParams.toString();

  // Read filter values directly from URL with stable references (useMemo prevents array recreation)
  const appliedGenres = useMemo(() => {
    const genresParam = searchParams.get('genres');
    return genresParam ? genresParam.split(',').filter(Boolean) : [];
  }, [searchParamsString]);

  const appliedRatingRange = useMemo((): [number, number] => {
    const ratingParam = searchParams.get('rating');
    return ratingParam 
      ? ratingParam.split('-').map(Number) as [number, number]
      : [0, 10];
  }, [searchParamsString]);

  const appliedYearRange = useMemo((): [number, number] => {
    const yearParam = searchParams.get('year');
    return yearParam 
      ? yearParam.split('-').map(Number) as [number, number]
      : [1900, 2030];
  }, [searchParamsString]);

  const appliedSearchText = useMemo(() => {
    return searchParams.get('search') || "";
  }, [searchParamsString]);

  const appliedPopularityRange = useMemo((): [number, number] => {
    const popularityParam = searchParams.get('popularity');
    return popularityParam 
      ? popularityParam.split('-').map(Number) as [number, number]
      : [0, 1000];
  }, [searchParamsString]);

  // Debug: Log when URL changes trigger filter updates
  useEffect(() => {
    console.log("[Movies] Filter values updated:", {
      genres: appliedGenres,
      rating: appliedRatingRange,
      year: appliedYearRange,
      search: appliedSearchText,
      popularity: appliedPopularityRange
    });
  }, [searchParamsString]);

  // Helper to update filters and reset page in one call
  const updateFiltersAndResetPage = (updates: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          newParams.set(key, value.join(','));
        } else {
          newParams.delete(key);
        }
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams, { replace: true });
    // Reset pagination state
    setCurrentPage(1);
    setAllMovies([]);
    setHasMoreMovies(true);
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = appliedGenres.includes(genre) ? appliedGenres.filter(g => g !== genre) : [...appliedGenres, genre];
    updateFiltersAndResetPage({ genres: newGenres.length > 0 ? newGenres.join(',') : null });
  };
  
  const handleResetFilters = () => {
    // Keep sortBy and sortOrder when resetting filters
    const newParams = new URLSearchParams();
    if (sortBy !== 'random') newParams.set('sortBy', sortBy);
    if (sortOrder !== 'desc') newParams.set('sortOrder', sortOrder);
    setSearchParams(newParams, { replace: true });
    // Reset pagination state
    setCurrentPage(1);
    setAllMovies([]);
    setHasMoreMovies(true);
  };
  
  const handleYearClick = (year: number) => {
    updateFiltersAndResetPage({ year: `${year}-${year}` });
  };
  
  const handleGenreClick = (genre: string) => {
    updateFiltersAndResetPage({ genres: genre });
  };
  
  const handleActorClick = (actor: string) => {
    updateFiltersAndResetPage({ search: actor });
  };
  
  const handleDirectorClick = (director: string) => {
    updateFiltersAndResetPage({ search: director });
  };
  
  const handleWriterClick = (writer: string) => {
    updateFiltersAndResetPage({ search: writer });
  };
  
  const handleKeywordClick = (keyword: string) => {
    updateFiltersAndResetPage({ search: keyword });
  };

  const handlePopularityClick = (min: number, max: number) => {
    updateFiltersAndResetPage({ popularity: `${min}-${max}` });
  };

  const handleAwardClick = (awardType: string) => {
    updateFiltersAndResetPage({ search: awardType });
  };

  const handleMixedClick = (type: string) => {
    if (type === "critical") {
      updateFiltersAndResetPage({ rating: '8-10', popularity: '0-20' });
    } else if (type === "audience") {
      updateFiltersAndResetPage({ rating: '7-10', popularity: '50-1000' });
    } else if (type === "boxoffice") {
      updateFiltersAndResetPage({ search: 'revenue' });
    }
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


  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAllMovies([]);
    setHasMoreMovies(true);
  }, [appliedGenres, appliedRatingRange, appliedYearRange, appliedSearchText, appliedPopularityRange, sortBy, sortOrder]);

  // Fetch movies with filters, pagination, and sorting
  const {
    data: moviesData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ["movies", appliedGenres, appliedRatingRange, appliedYearRange, appliedSearchText, appliedPopularityRange, currentPage, sortBy, sortOrder, itemsPerPage],
    queryFn: async () => {
      console.log("[Movies Query] Starting fetch with filters:", {
        genres: appliedGenres,
        rating: appliedRatingRange,
        year: appliedYearRange,
        search: appliedSearchText,
        popularity: appliedPopularityRange,
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

        // Apply text search across multiple fields
        if (appliedSearchText) {
          query = query.or(`title.ilike.%${appliedSearchText}%,actors.ilike.%${appliedSearchText}%,director.ilike.%${appliedSearchText}%,writing.ilike.%${appliedSearchText}%,keywords.cs.{${appliedSearchText}},awards.ilike.%${appliedSearchText}%`);
        }

        // Apply popularity filter
        if (appliedPopularityRange[0] > 0 || appliedPopularityRange[1] < 1000) {
          query = query.gte("popularity", appliedPopularityRange[0]).lte("popularity", appliedPopularityRange[1]);
        }

        // Skip database-level sorting for user_rating (PostgREST limitation with embedded resources)
        // We'll sort client-side instead

        // Apply pagination
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        
        // Client-side sorting for user_rating (PostgREST can't order by embedded resource columns)
        if (data && Array.isArray(data)) {
          data.sort((a, b) => {
            const aRating = a.user_ratings?.[0]?.user_rating ?? 0;
            const bRating = b.user_ratings?.[0]?.user_rating ?? 0;
            return sortOrder === "asc" ? aRating - bRating : bRating - aRating;
          });
          console.log("[Movies Query] Client-side sorted by user_rating", sortOrder);
        }
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

      // Apply text search across multiple fields
      if (appliedSearchText) {
        query = query.or(`title.ilike.%${appliedSearchText}%,actors.ilike.%${appliedSearchText}%,director.ilike.%${appliedSearchText}%,writing.ilike.%${appliedSearchText}%,keywords.cs.{${appliedSearchText}},awards.ilike.%${appliedSearchText}%`);
      }

      // Apply popularity filter
      if (appliedPopularityRange[0] > 0 || appliedPopularityRange[1] < 1000) {
        query = query.gte("popularity", appliedPopularityRange[0]).lte("popularity", appliedPopularityRange[1]);
      }

      // Apply sorting - prioritize IMDb rating for rating sorts
      if (sortBy === 'rating') {
        // Sort by IMDb rating when available, then by TMDB rating
        query = query.order('imdb_rating', { ascending: sortOrder === "asc", nullsFirst: false });
        query = query.order('rating', { ascending: sortOrder === "asc" });
      } else if (sortBy === 'random') {
        // For random, we'll shuffle client-side after fetching
        query = query.order('id', { ascending: true });
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
      
      let movies = (data || []).map((movie): Movie => ({
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
      }));

      // Apply random shuffle if random sort is selected
      if (sortBy === 'random') {
        // Use Fisher-Yates shuffle with a seeded random for consistency within page
        const seed = currentPage;
        const shuffled = [...movies];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(((seed * (i + 1)) % 997) / 997 * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        movies = shuffled;
      }
      
      return {
        movies,
        totalCount: count || 0
      };
    },
    staleTime: 60000, // 1 minute - optimized caching
    gcTime: 300000, // 5 minutes cache time
  });

  // Update allMovies when new data arrives
  useEffect(() => {
    if (moviesData?.movies) {
      if (currentPage === 1) {
        setAllMovies(moviesData.movies);
      } else {
        setAllMovies(prev => [...prev, ...moviesData.movies]);
      }
      
      // Check if there are more movies to load
      const totalLoaded = currentPage * itemsPerPage;
      setHasMoreMovies(totalLoaded < (moviesData.totalCount || 0));
    }
  }, [moviesData, currentPage, itemsPerPage]);

  const movies = allMovies;
  const totalCount = moviesData?.totalCount || 0;

  // Load more handler
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreMovies) {
      setIsLoadingMore(true);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Reset loading more when new data arrives
  useEffect(() => {
    if (!isLoading) {
      setIsLoadingMore(false);
    }
  }, [isLoading]);

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
    
    // Defensive validation: prevent user_rating sort when not logged in
    if (field === "user_rating" && !user) {
      console.warn("[Movies] Attempted to set user_rating sort without logged in user - defaulting to rating");
      updateFiltersAndResetPage({ sortBy: 'rating', sortOrder: 'desc' });
      return;
    }
    
    updateFiltersAndResetPage({ sortBy: field, sortOrder: order });
  };

  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel 
            selectedGenres={appliedGenres} 
            onGenreToggle={handleGenreToggle} 
            ratingRange={appliedRatingRange} 
            onRatingRangeChange={(range) => {
              updateFiltersAndResetPage({ 
                rating: range[0] !== 0 || range[1] !== 10 ? `${range[0]}-${range[1]}` : null 
              });
            }} 
            yearRange={appliedYearRange} 
            onYearRangeChange={(range) => {
              updateFiltersAndResetPage({ 
                year: range[0] !== 1900 || range[1] !== 2030 ? `${range[0]}-${range[1]}` : null 
              });
            }} 
            searchText={appliedSearchText} 
            onSearchTextChange={(text) => {
              updateFiltersAndResetPage({ search: text || null });
            }} 
            onReset={handleResetFilters} 
          />
        </div>

        {/* Results */}
        <main ref={resultsRef}>
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Movies</h2>
              {/* Enhancement 2: Show more context */}
              <p className="text-muted-foreground">
                {isLoading && movies.length === 0
                  ? "Loading..." 
                  : totalCount > 0 
                    ? `Showing ${movies.length > 0 ? `1-${movies.length}` : '0'} of ${totalCount} ${totalCount === 1 ? "movie" : "movies"}` 
                    : "No results found"
                }
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random-desc">Random</SelectItem>
                  <SelectItem value="rating-desc">Rating (High to Low)</SelectItem>
                  <SelectItem value="rating-asc">Rating (Low to High)</SelectItem>
                  {user && (
                    <>
                      <SelectItem value="user_rating-desc">My Rating (High to Low)</SelectItem>
                      <SelectItem value="user_rating-asc">My Rating (Low to High)</SelectItem>
                    </>
                  )}
                  <SelectItem value="year-desc">Year (Newest First)</SelectItem>
                  <SelectItem value="year-asc">Year (Oldest First)</SelectItem>
                  <SelectItem value="title-asc">Title (A to Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z to A)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
                setAllMovies([]);
                setHasMoreMovies(true);
              }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
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

          {isLoading && movies.length === 0 ? <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
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
                      onActorClick={handleActorClick}
                      onDirectorClick={handleDirectorClick}
                      onWriterClick={handleWriterClick}
                      onKeywordClick={handleKeywordClick}
                      onOpenDetail={handleOpenDetail}
                    />
                  );
                })}
              </div>
              
              {/* Load More Button */}
              {hasMoreMovies && (
                <div className="flex justify-center mt-8 mb-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore || isLoading}
                    size="lg"
                    variant="outline"
                  >
                    {isLoadingMore || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalCount - movies.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </> : <>
              {/* Table view */}
              <div className="mb-8">
                <MoviesTable movies={movies} title="Movies" onOpenDetail={handleOpenDetail} />
              </div>
              
              {/* Load More Button */}
              {hasMoreMovies && (
                <div className="flex justify-center mt-8 mb-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore || isLoading}
                    size="lg"
                    variant="outline"
                  >
                    {isLoadingMore || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalCount - movies.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
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