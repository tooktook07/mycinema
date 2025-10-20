import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Movie } from "@/data/types";
import { MovieStatsCard } from "./MovieStatsCard";
import { MovieEditDialog } from "./MovieEditDialog";
import { MovieSyncDialog } from "./MovieSyncDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Award,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 50;

export const MovieManagement = () => {
  const { toast } = useToast();
  const [movies, setMovies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [editMovie, setEditMovie] = useState<Movie | null>(null);
  const [syncMovie, setSyncMovie] = useState<Movie | null>(null);
  const [deleteMovie, setDeleteMovie] = useState<Movie | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // First, fetch basic movie data with pagination
      let movieQuery = supabase
        .from('movies')
        .select('*', { count: 'exact' });

      // Apply sorting
      if (sortBy) {
        movieQuery = movieQuery.order(sortBy, { ascending: sortDirection === 'asc' });
      } else {
        movieQuery = movieQuery.order('title', { ascending: true });
      }

      movieQuery = movieQuery.range(from, to);

      if (searchQuery) {
        movieQuery = movieQuery.ilike('title', `%${debouncedSearchQuery}%`);
      }

      const { data: movieData, error: movieError, count } = await movieQuery;

      if (movieError) throw movieError;

      if (!movieData || movieData.length === 0) {
        setMovies([]);
        setTotalCount(0);
        return;
      }

      // Fetch user ratings for these movies separately
      const movieIds = movieData.map(m => m.id);
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_ratings')
        .select('media_id, user_rating, in_watchlist')
        .in('media_id', movieIds)
        .eq('media_type', 'movie');

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
      }

      // Group ratings by movie
      const ratingsByMovie = new Map();
      ratingsData?.forEach((rating: any) => {
        if (!ratingsByMovie.has(rating.media_id)) {
          ratingsByMovie.set(rating.media_id, []);
        }
        ratingsByMovie.get(rating.media_id).push(rating);
      });

      // Process data to add computed fields
      const processedData = movieData.map((movie: any) => {
        const movieRatings = ratingsByMovie.get(movie.id) || [];
        const watchlistCount = movieRatings.filter((r: any) => r.in_watchlist).length;
        const validRatings = movieRatings
          .filter((r: any) => r.user_rating !== null)
          .map((r: any) => r.user_rating);
        const avgUserRating = validRatings.length > 0
          ? validRatings.reduce((sum: number, r: number) => sum + r, 0) / validRatings.length
          : 0;

        return {
          ...movie,
          watchlistCount,
          avgUserRating,
          ratingCount: validRatings.length
        };
      });

      setMovies(processedData);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching movies:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load movies",
        variant: "destructive",
      });
      setMovies([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch lightweight stats using count queries
      const [
        totalResult,
        omdbResult,
        postersResult,
        watchlistResult,
        ratingsResult,
        genresResult,
        decadeResult
      ] = await Promise.all([
        // Total movies count
        supabase.from('movies').select('id', { count: 'exact', head: true }),
        
        // Movies with OMDb data
        supabase.from('movies')
          .select('id', { count: 'exact', head: true })
          .not('data_sources', 'is', null)
          .filter('data_sources', 'cs', '{"omdb":true}'),
        
        // Movies with local posters
        supabase.from('movies')
          .select('id', { count: 'exact', head: true })
          .not('local_poster_url', 'is', null),
        
        // Total watchlist saves
        supabase.from('user_ratings')
          .select('id', { count: 'exact', head: true })
          .eq('in_watchlist', true)
          .eq('media_type', 'movie'),
        
        // User ratings stats
        supabase.from('user_ratings')
          .select('user_rating')
          .not('user_rating', 'is', null)
          .eq('media_type', 'movie'),
        
        // Genre distribution using RPC
        supabase.rpc('get_genre_stats'),
        
        // Decade distribution using RPC
        supabase.rpc('get_decade_stats')
      ]);

      const totalMovies = totalResult.count || 0;
      const withOmdb = omdbResult.count || 0;
      const withPosters = postersResult.count || 0;
      const totalWatchlistSaves = watchlistResult.count || 0;

      // Calculate average user rating
      const ratings = ratingsResult.data || [];
      const avgUserRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + (r.user_rating || 0), 0) / ratings.length
        : 0;

      // Genre distribution (already aggregated by database)
      const byGenre = (genresResult.data || []).map((item: any) => ({
        genre: item.genre,
        count: Number(item.count)
      }));

      // Decade distribution (already aggregated by database)
      const decadeData = (decadeResult.data || []).map((item: any) => ({
        decade: item.decade,
        count: Number(item.count)
      }));

      // Group decades into display format
      const byYear = decadeData.map(({ decade, count }) => ({
        year: decade,
        count
      }));

      setStats({
        totalMovies,
        withOmdb,
        withPosters,
        totalWatchlistSaves,
        avgUserRating,
        byGenre,
        byYear
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Stats Error",
        description: "Failed to load statistics. Showing limited data.",
        variant: "destructive",
      });
      // Set empty stats on error
      setStats({
        totalMovies: 0,
        withOmdb: 0,
        withPosters: 0,
        totalWatchlistSaves: 0,
        avgUserRating: 0,
        byGenre: [],
        byYear: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [currentPage, debouncedSearchQuery, sortBy, sortDirection]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async () => {
    if (!deleteMovie) return;

    try {
      const { error } = await supabase.functions.invoke('delete-movie', {
        body: { movieId: deleteMovie.id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Movie deleted successfully",
      });

      fetchMovies();
      fetchStats();
      setDeleteMovie(null);
    } catch (error: any) {
      console.error('Error deleting movie:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete movie",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSort = (column: 'created_at' | 'updated_at') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: 'created_at' | 'updated_at') => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPipelineInfo = (movie: any, type: 'created' | 'updated') => {
    const date = type === 'created' ? movie.created_at : movie.updated_at;
    if (!date) return 'Unknown';

    const info = [`${type === 'created' ? 'Created' : 'Updated'}: ${formatDate(date)}`];
    
    // Check data sources to infer pipeline
    if (movie.data_sources?.omdb && movie.last_omdb_fetch) {
      const omdbDate = new Date(movie.last_omdb_fetch);
      const targetDate = new Date(date);
      const diffMs = Math.abs(omdbDate.getTime() - targetDate.getTime());
      if (diffMs < 60000) { // Within 1 minute
        info.push('Pipeline: OMDb Enrichment');
      }
    }
    
    if (movie.local_poster_url) {
      info.push('Has: Poster Storage');
    }
    
    if (movie.data_sources?.tmdb) {
      info.push('Source: TMDB Import');
    }

    return info.join('\n');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <MovieStatsCard stats={stats} loading={statsLoading} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${totalCount} movies total`}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Poster</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Genres</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Sources</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created
                        {getSortIcon('created_at')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center">
                        Updated
                        {getSortIcon('updated_at')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movies.map((movie) => (
                    <TableRow key={movie.id}>
                      <TableCell>
                        <img
                          src={movie.local_poster_url || movie.poster || '/placeholder.svg'}
                          alt={movie.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{movie.title}</TableCell>
                      <TableCell>{movie.year}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {movie.rating && (
                            <div>TMDB: {movie.rating.toFixed(1)}</div>
                          )}
                          {movie.imdb_rating && (
                            <div>IMDb: {movie.imdb_rating.toFixed(1)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {movie.genres?.slice(0, 2).map((genre: string) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {movie.genres?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{movie.genres.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div>🔖 {movie.watchlistCount}</div>
                          {movie.ratingCount > 0 && (
                            <div>⭐ {movie.avgUserRating.toFixed(1)} ({movie.ratingCount})</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={(movie.data_sources as any)?.tmdb ? "default" : "outline"} className="text-xs">
                            <Database className="h-3 w-3 mr-1" />
                            TMDB
                          </Badge>
                          <Badge variant={(movie.data_sources as any)?.omdb ? "default" : "outline"} className="text-xs">
                            <Award className="h-3 w-3 mr-1" />
                            OMDb
                          </Badge>
                          <Badge variant={movie.local_poster_url ? "default" : "outline"} className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Poster
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground cursor-help">
                              {movie.created_at ? formatDate(movie.created_at).split(',')[0] : 'N/A'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="whitespace-pre-line">
                            {getPipelineInfo(movie, 'created')}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground cursor-help">
                              {movie.updated_at ? formatDate(movie.updated_at).split(',')[0] : 'N/A'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="whitespace-pre-line">
                            {getPipelineInfo(movie, 'updated')}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditMovie(movie)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSyncMovie(movie)}
                            title="Sync"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://www.imdb.com/title/${movie.imdb_id}`, '_blank')}
                            title="View on IMDb"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteMovie(movie)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <MovieEditDialog
        movie={editMovie}
        open={!!editMovie}
        onOpenChange={(open) => !open && setEditMovie(null)}
        onSuccess={() => {
          fetchMovies();
          fetchStats();
        }}
      />

      <MovieSyncDialog
        movie={syncMovie}
        open={!!syncMovie}
        onOpenChange={(open) => !open && setSyncMovie(null)}
        onSuccess={() => {
          fetchMovies();
          fetchStats();
        }}
      />

      <AlertDialog open={!!deleteMovie} onOpenChange={(open) => !open && setDeleteMovie(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Movie</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteMovie?.title}"? This will also remove all user ratings and watchlist entries for this movie. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
