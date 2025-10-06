import { Film, Tv, Star, TrendingUp, Calendar, BarChart3, Loader2, LogIn, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { MovieCard } from "@/components/MovieCard";
import { LastSyncCard } from "@/components/LastSyncCard";
interface Stats {
  totalMovies: number;
  totalTvShows: number;
  avgMovieRating: number;
  userRatingsCount: number;
  userAvgRating: number;
  yearRange: {
    earliest: number;
    latest: number;
  } | null;
  topGenres: {
    genre: string;
    count: number;
  }[];
  recentMovies: {
    title: string;
    rating: number;
    year: number;
    poster: string;
  }[];
  lastSync: {
    created_at: string;
    imported: number;
    updated: number;
  } | null;
}
interface Recommendation {
  id: string;
  title: string;
  year: number;
  genre: string[];
  poster: string;
  rating: number;
  plot: string;
  imdbId: string;
  voteCount?: number;
  originalLanguage?: string;
  actors?: string;
  director?: string;
  runtime?: string;
  writing?: string;
  sound?: string;
  keywords?: string[];
}
const RATING_THRESHOLD = 7.0; // User's liked movies threshold
const CANDIDATE_RATING_THRESHOLD = 6.5; // Minimum quality for recommendations
const RECOMMENDATIONS_COUNT = 12;
const MIN_RATINGS_FOR_PERSONALIZATION = 5; // Minimum ratings needed for similarity algorithm

// Similarity weights
const WEIGHTS = {
  GENRE: 0.35,
  DIRECTOR: 0.20,
  ACTOR: 0.20,
  KEYWORD: 0.15,
  LANGUAGE: 0.10,
};
const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isAdmin
  } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  useEffect(() => {
    fetchStats();
    fetchRecommendations();
  }, [user]);
  const fetchStats = async () => {
    try {
      // Fetch total movies
      const {
        count: moviesCount
      } = await supabase.from("movies").select("*", {
        count: "exact",
        head: true
      });

      // Fetch total TV shows
      const {
        count: tvShowsCount
      } = await supabase.from("tv_shows").select("*", {
        count: "exact",
        head: true
      });

      // Fetch average rating
      const {
        data: moviesData
      } = await supabase.from("movies").select("rating");
      const avgRating = moviesData && moviesData.length > 0 ? moviesData.reduce((acc, m) => acc + (m.rating || 0), 0) / moviesData.length : 0;

      // Fetch all movies with genres to calculate top genres
      const {
        data: allMovies
      } = await supabase.from("movies").select("genres");
      const genreCounts: Record<string, number> = {};
      allMovies?.forEach(movie => {
        movie.genres?.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      });
      const topGenres = Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        count
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      // Fetch recent top-rated movies
      const {
        data: recentMovies
      } = await supabase.from("movies").select("title, rating, year, poster").order("rating", {
        ascending: false
      }).limit(5);

      // Fetch last sync
      const {
        data: lastSync
      } = await supabase.from("sync_history").select("*").order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();

      // Fetch year range
      const { data: yearData } = await supabase
        .from("movies")
        .select("year")
        .order("year", { ascending: true });
      
      let yearRange = null;
      if (yearData && yearData.length > 0) {
        yearRange = {
          earliest: yearData[0].year,
          latest: yearData[yearData.length - 1].year
        };
      }

      // Fetch user-specific ratings if logged in (only for real users)
      let userRatingsCount = 0;
      let userAvgRating = 0;
      if (user && user.id !== 'dev-user-id') {
        const {
          data: userRatings
        } = await supabase.from("user_ratings").select("user_rating").eq("user_id", user.id).not("user_rating", "is", null);
        if (userRatings?.length) {
          userRatingsCount = userRatings.length;
          userAvgRating = userRatings.reduce((acc, r) => acc + (r.user_rating || 0), 0) / userRatings.length;
        }
      }
      setStats({
        totalMovies: moviesCount || 0,
        totalTvShows: tvShowsCount || 0,
        avgMovieRating: avgRating,
        userRatingsCount,
        userAvgRating,
        yearRange,
        topGenres,
        recentMovies: recentMovies || [],
        lastSync
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      // Fetch user's rated movies if logged in
      let userLikedMovies: any[] = [];
      let ratedMovieIds: string[] = [];
      
      if (user && user.id !== 'dev-user-id') {
        const { data: userRatings } = await supabase
          .from('user_ratings')
          .select('media_id, user_rating')
          .eq('user_id', user.id)
          .eq('media_type', 'movie')
          .not('user_rating', 'is', null);
        
        ratedMovieIds = (userRatings || []).map(r => r.media_id).filter(Boolean) as string[];
        
        // Get movies the user liked (rating >= 7.0) with full details
        const likedRatings = (userRatings || []).filter(r => (r.user_rating || 0) >= RATING_THRESHOLD);
        
        if (likedRatings.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
          const { data: likedMoviesData } = await supabase
            .from('movies')
            .select('genres, director, actors, keywords, original_language')
            .in('id', likedRatings.map(r => r.media_id));
          
          userLikedMovies = likedMoviesData || [];
        }
      }

      // If user has enough ratings, use similarity algorithm
      if (userLikedMovies.length >= MIN_RATINGS_FOR_PERSONALIZATION) {
        // Analyze user preferences
        const genreCounts: Record<string, number> = {};
        const directorCounts: Record<string, number> = {};
        const actorCounts: Record<string, number> = {};
        const keywordCounts: Record<string, number> = {};
        const languageCounts: Record<string, number> = {};

        userLikedMovies.forEach(movie => {
          // Count genres
          (movie.genres || []).forEach((genre: string) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
          
          // Count directors
          if (movie.director) {
            directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
          }
          
          // Count actors (split by comma)
          if (movie.actors) {
            movie.actors.split(',').forEach((actor: string) => {
              const cleanActor = actor.trim();
              if (cleanActor) {
                actorCounts[cleanActor] = (actorCounts[cleanActor] || 0) + 1;
              }
            });
          }
          
          // Count keywords
          (movie.keywords || []).forEach((keyword: string) => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          });
          
          // Count languages
          if (movie.original_language) {
            languageCounts[movie.original_language] = (languageCounts[movie.original_language] || 0) + 1;
          }
        });

        // Fetch candidate movies (unrated, decent quality)
        const { data: candidateMovies } = await supabase
          .from('movies')
          .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords')
          .gte('rating', CANDIDATE_RATING_THRESHOLD)
          .not('rating', 'is', null)
          .not('id', 'in', `(${ratedMovieIds.join(',')})`)
          .limit(500); // Get a large pool to calculate similarity

        // Calculate similarity scores
        const moviesWithScores = (candidateMovies || []).map(movie => {
          let score = 0;
          
          // Genre similarity
          const genreMatches = (movie.genres || []).filter((g: string) => genreCounts[g]).length;
          const genreWeight = genreMatches / Math.max(Object.keys(genreCounts).length, 1);
          score += genreWeight * WEIGHTS.GENRE;
          
          // Director similarity
          if (movie.director && directorCounts[movie.director]) {
            score += WEIGHTS.DIRECTOR;
          }
          
          // Actor similarity
          let actorMatches = 0;
          if (movie.actors) {
            const movieActors = movie.actors.split(',').map((a: string) => a.trim());
            actorMatches = movieActors.filter((a: string) => actorCounts[a]).length;
          }
          const actorWeight = Math.min(actorMatches / 3, 1); // Cap at 3 matching actors
          score += actorWeight * WEIGHTS.ACTOR;
          
          // Keyword similarity
          const keywordMatches = (movie.keywords || []).filter((k: string) => keywordCounts[k]).length;
          const keywordWeight = Math.min(keywordMatches / 3, 1); // Cap at 3 matching keywords
          score += keywordWeight * WEIGHTS.KEYWORD;
          
          // Language similarity
          if (movie.original_language && languageCounts[movie.original_language]) {
            score += WEIGHTS.LANGUAGE;
          }
          
          // Slight boost for popularity (normalized vote count)
          const popularityBoost = Math.min((movie.vote_count || 0) / 10000, 0.1);
          score += popularityBoost;
          
          return { ...movie, similarityScore: score };
        });

        // Sort by similarity score and select top recommendations
        const topRecommendations = moviesWithScores
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, RECOMMENDATIONS_COUNT)
          .map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.year,
            poster: movie.poster || '',
            rating: movie.rating || 0,
            plot: movie.plot || '',
            imdbId: movie.imdb_id,
            voteCount: movie.vote_count,
            originalLanguage: movie.original_language,
            genre: movie.genres || [],
            actors: movie.actors || '',
            director: movie.director || '',
            runtime: movie.runtime || '',
            writing: movie.writing || '',
            sound: movie.sound || '',
            keywords: movie.keywords || []
          }));

        setRecommendations(topRecommendations);
      } else {
        // Fallback: Show top-rated movies for users with few/no ratings
        const { data: topMovies, error } = await supabase
          .from('movies')
          .select('id, title, year, genres, poster, rating, plot, imdb_id, vote_count, original_language, actors, director, runtime, writing, sound, keywords')
          .gte('rating', RATING_THRESHOLD)
          .not('rating', 'is', null)
          .order('vote_count', { ascending: false })
          .limit(200);

        if (error) throw error;

        // Filter out already rated movies for logged-in users
        const filteredMovies = user && ratedMovieIds.length > 0
          ? (topMovies || []).filter(movie => !ratedMovieIds.includes(movie.id))
          : topMovies || [];

        // Randomly select from top-rated
        const shuffled = filteredMovies.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, RECOMMENDATIONS_COUNT).map(movie => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          poster: movie.poster || '',
          rating: movie.rating || 0,
          plot: movie.plot || '',
          imdbId: movie.imdb_id,
          voteCount: movie.vote_count,
          originalLanguage: movie.original_language,
          genre: movie.genres || [],
          actors: movie.actors || '',
          director: movie.director || '',
          runtime: movie.runtime || '',
          writing: movie.writing || '',
          sound: movie.sound || '',
          keywords: movie.keywords || []
        }));

        setRecommendations(selected);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="min-h-screen">
      {/* Hero Section */}
      <div className="border-b px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-10 w-10" />
            <h1 className="text-4xl font-bold md:text-4xl">
              Welcome to My Cinema App
            </h1>
          </div>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-6 text-base font-thin">
            {user 
              ? "Your personal movie and TV show statistics" 
              : `Discover and rate ${stats?.totalMovies.toLocaleString() || 0} movies${stats?.yearRange ? ` (${stats.yearRange.earliest} - ${stats.yearRange.latest})` : ''}. Sign in to start rating!`
            }
          </p>
          {stats?.lastSync && <div className="flex justify-center">
              <Badge variant="outline" className="text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Last sync: {format(new Date(stats.lastSync.created_at), "PPp")} 
                ({stats.lastSync.imported + stats.lastSync.updated} movies)
              </Badge>
            </div>}
          {!user && <div className="flex justify-center mt-4">
              <Button size="lg" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Rate Movies
              </Button>
            </div>}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link to="/movies">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMovies.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Browse collection <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tv-shows">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">TV Shows</CardTitle>
                <Tv className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Coming Soon</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Check status <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {user ? "Your Ratings" : "Average Rating"}
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {user && stats?.userRatingsCount > 0 ? <>
                  <div className="text-2xl font-bold">{stats.userAvgRating.toFixed(1)}/10</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.userRatingsCount} {stats.userRatingsCount === 1 ? 'rating' : 'ratings'}
                  </p>
                </> : user ? <>
                  <div className="text-2xl font-bold">0/10</div>
                  <p className="text-xs text-muted-foreground">No ratings yet</p>
                </> : <>
                  <div className="text-2xl font-bold">{stats?.avgMovieRating.toFixed(1)}/10</div>
                  <p className="text-xs text-muted-foreground">Across all movies</p>
                </>}
            </CardContent>
          </Card>

          <LastSyncCard lastSync={stats?.lastSync || null} isAdmin={isAdmin} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button onClick={() => navigate("/movies")} variant="outline">
            <Film className="h-4 w-4 mr-2" />
            Browse Movies
          </Button>
          <Button onClick={() => navigate("/tv-shows")} variant="outline">
            <Tv className="h-4 w-4 mr-2" />
            Browse TV Shows
          </Button>
          {isAdmin && <Button onClick={() => navigate("/account")} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Sync Data
            </Button>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recommendations for all users */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {user ? <>
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    AI Recommendations For You
                  </> : <>
                    <Star className="h-5 w-5 text-yellow-500" />
                    Top Rated Movies
                  </>}
              </CardTitle>
              <CardDescription>
                {user 
                  ? stats?.userRatingsCount && stats.userRatingsCount >= MIN_RATINGS_FOR_PERSONALIZATION
                    ? "Based on your ratings and preferences, we think you'll love these movies"
                    : `Rate ${MIN_RATINGS_FOR_PERSONALIZATION}+ movies to get personalized AI recommendations`
                  : "Discover highly-rated movies from our collection"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecommendations ? <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      {user ? "Finding movies you'll love..." : "Loading top movies..."}
                    </p>
                  </div>
                </div> : recommendations.length === 0 ? <div className="text-center py-12 px-4 bg-muted/30 rounded-lg border-2 border-dashed">
                  <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">
                    {user ? "No recommendations yet" : "No movies available"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {user ? `Rate at least ${MIN_RATINGS_FOR_PERSONALIZATION} movies with 7+ stars to get personalized recommendations` : "Check back later for top-rated movies"}
                  </p>
                  <Button onClick={() => navigate("/movies")} variant="outline">
                    <Film className="h-4 w-4 mr-2" />
                    Browse Movies
                  </Button>
                </div> : <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {recommendations?.map(movie => <MovieCard key={movie.id} id={movie.id} title={movie.title} year={movie.year} rating={movie.rating} genre={movie.genre} poster={movie.poster} imdbId={movie.imdbId} plot={movie.plot} voteCount={movie.voteCount} originalLanguage={movie.originalLanguage} actors={movie.actors} director={movie.director} runtime={movie.runtime} writing={movie.writing} sound={movie.sound} keywords={movie.keywords} />)}
                </div>}
            </CardContent>
          </Card>

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
              {stats?.topGenres.length === 0 ? <p className="text-sm text-muted-foreground">No genres available yet</p> : <div className="space-y-3">
                  {stats?.topGenres.map((item, index) => <Link key={item.genre} to={`/movies?genre=${encodeURIComponent(item.genre)}`} className="flex items-center justify-between hover:bg-accent/50 p-2 -mx-2 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="font-medium">{item.genre}</span>
                      </div>
                      <Badge variant="outline">{item.count} movies</Badge>
                    </Link>)}
                </div>}
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
              {stats?.recentMovies.length === 0 ? <p className="text-sm text-muted-foreground">No movies available yet</p> : <div className="space-y-3">
                  {stats?.recentMovies.map(movie => <div key={movie.title} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">{movie.year}</p>
                      </div>
                      <Badge className="ml-2">
                        <Star className="h-3 w-3 mr-1" />
                        {movie.rating?.toFixed(1)}
                      </Badge>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Index;