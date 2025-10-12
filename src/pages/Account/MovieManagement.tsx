import { useState, useEffect } from "react";
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
  Image as ImageIcon
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [editMovie, setEditMovie] = useState<Movie | null>(null);
  const [syncMovie, setSyncMovie] = useState<Movie | null>(null);
  const [deleteMovie, setDeleteMovie] = useState<Movie | null>(null);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('movies')
        .select(`
          *,
          user_ratings(user_rating, in_watchlist)
        `, { count: 'exact' })
        .order('title', { ascending: true })
        .range(from, to);

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Process data to add computed fields
      const processedData = data?.map((movie: any) => {
        const watchlistCount = movie.user_ratings?.filter((r: any) => r.in_watchlist).length || 0;
        const ratings = movie.user_ratings?.filter((r: any) => r.user_rating !== null).map((r: any) => r.user_rating) || [];
        const avgUserRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
          : 0;

        return {
          ...movie,
          watchlistCount,
          avgUserRating,
          ratingCount: ratings.length
        };
      }) || [];

      setMovies(processedData);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching movies:', error);
      toast({
        title: "Error",
        description: "Failed to load movies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch all movies for stats
      const { data: allMovies, error } = await supabase
        .from('movies')
        .select(`
          *,
          user_ratings(user_rating, in_watchlist)
        `);

      if (error) throw error;

      // Calculate stats
      const totalMovies = allMovies?.length || 0;
      const withOmdb = allMovies?.filter(m => {
        const sources = m.data_sources as { tmdb?: boolean; omdb?: boolean } | null;
        return sources?.omdb === true;
      }).length || 0;
      const withPosters = allMovies?.filter(m => m.local_poster_url).length || 0;

      let totalWatchlistSaves = 0;
      let totalRatings = 0;
      let ratingSum = 0;

      allMovies?.forEach((movie: any) => {
        movie.user_ratings?.forEach((r: any) => {
          if (r.in_watchlist) totalWatchlistSaves++;
          if (r.user_rating !== null) {
            totalRatings++;
            ratingSum += r.user_rating;
          }
        });
      });

      const avgUserRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

      // Genre distribution
      const genreCounts: { [key: string]: number } = {};
      allMovies?.forEach((movie: any) => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });
      const byGenre = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);

      // Year distribution
      const yearCounts: { [key: number]: number } = {};
      allMovies?.forEach((movie: any) => {
        yearCounts[movie.year] = (yearCounts[movie.year] || 0) + 1;
      });
      const byYear = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => b.year - a.year);

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
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [currentPage, searchQuery]);

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

  return (
    <div className="space-y-6">
      <MovieStatsCard stats={stats} loading={statsLoading} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {totalCount} movies total
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
  );
};
