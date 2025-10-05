import { Film, Tv, Star, TrendingUp, Calendar, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Stats {
  totalMovies: number;
  totalTvShows: number;
  avgMovieRating: number;
  topGenres: { genre: string; count: number }[];
  recentMovies: any[];
  lastSync: any;
}

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total movies
      const { count: moviesCount } = await supabase
        .from("movies")
        .select("*", { count: "exact", head: true });

      // Fetch total TV shows
      const { count: tvShowsCount } = await supabase
        .from("tv_shows")
        .select("*", { count: "exact", head: true });

      // Fetch average rating
      const { data: moviesData } = await supabase
        .from("movies")
        .select("rating");
      
      const avgRating = moviesData && moviesData.length > 0
        ? moviesData.reduce((acc, m) => acc + (m.rating || 0), 0) / moviesData.length
        : 0;

      // Fetch all movies with genres to calculate top genres
      const { data: allMovies } = await supabase
        .from("movies")
        .select("genres");

      const genreCounts: Record<string, number> = {};
      allMovies?.forEach((movie) => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });

      const topGenres = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Fetch recent top-rated movies
      const { data: recentMovies } = await supabase
        .from("movies")
        .select("title, rating, year, poster")
        .order("rating", { ascending: false })
        .limit(5);

      // Fetch last sync
      const { data: lastSync } = await supabase
        .from("sync_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        totalMovies: moviesCount || 0,
        totalTvShows: tvShowsCount || 0,
        avgMovieRating: avgRating,
        topGenres,
        recentMovies: recentMovies || [],
        lastSync,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Hero Section */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/20 via-background to-primary/20 px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-bold text-foreground md:text-5xl">CineMatch Dashboard</h1>
          </div>
          <p className="text-center text-lg text-muted-foreground max-w-2xl mx-auto">
            Your personal movie and TV show database statistics
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMovies.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                In your database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TV Shows</CardTitle>
              <Tv className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTvShows.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Series available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgMovieRating.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">
                Across all movies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.lastSync ? format(new Date(stats.lastSync.created_at), "MMM d") : "Never"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.lastSync ? `${stats.lastSync.imported + stats.lastSync.updated} changes` : "No syncs yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button onClick={() => navigate("/movies")} size="lg">
            <Film className="h-4 w-4 mr-2" />
            Browse Movies
          </Button>
          <Button onClick={() => navigate("/tv-shows")} variant="outline" size="lg">
            <Tv className="h-4 w-4 mr-2" />
            Browse TV Shows
          </Button>
          <Button onClick={() => navigate("/account")} variant="outline" size="lg">
            <TrendingUp className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Genres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Genres
              </CardTitle>
              <CardDescription>Most popular genres in your database</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.topGenres.length === 0 ? (
                <p className="text-sm text-muted-foreground">No genres available yet</p>
              ) : (
                <div className="space-y-3">
                  {stats?.topGenres.map((item, index) => (
                    <div key={item.genre} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="font-medium">{item.genre}</span>
                      </div>
                      <Badge variant="outline">{item.count} movies</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Rated Movies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Rated Movies
              </CardTitle>
              <CardDescription>Highest rated films in your collection</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentMovies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movies available yet</p>
              ) : (
                <div className="space-y-3">
                  {stats?.recentMovies.map((movie) => (
                    <div key={movie.title} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">{movie.year}</p>
                      </div>
                      <Badge className="ml-2">
                        <Star className="h-3 w-3 mr-1" />
                        {movie.rating?.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
