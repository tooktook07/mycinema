import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { SEOHead } from "@/components/SEO/SEOHead";
import { generateMovieSchema } from "@/components/SEO/schemas/MovieSchema";
import { generateBreadcrumbSchema } from "@/components/SEO/schemas/BreadcrumbSchema";
import {
  Star,
  ExternalLink,
  Search,
  Globe,
  DollarSign,
  Calendar,
  Film,
  Languages,
  ThumbsDown,
  ThumbsUp,
  Heart,
  ArrowLeft,
  Award,
  Briefcase,
  Play,
  Home,
  ChevronRight,
} from "lucide-react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { MovieWatchlist } from "@/components/MovieWatchlist";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { saveGuestRating, getGuestRatings } from "@/lib/guestRatings";
import { getSimilarMovies } from "@/lib/recommendationEngine";
import { useParams, useNavigate, Link } from "react-router-dom";
import { parseMovieSlug, getMovieUrl, getGenreUrl, getPersonUrl, getKeywordUrl, getYearUrl, getLanguageUrl, getCompanyUrl, getCountryUrl, getStreamingUrl } from "@/lib/urlUtils";

const MovieDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useEffectiveAuth();

  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Parse slug to get title pattern and year
  const parsedSlug = slug ? parseMovieSlug(slug) : null;

  // Fetch movie by title pattern and year
  const {
    data: movie,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["movieBySlug", slug],
    queryFn: async () => {
      if (!parsedSlug) throw new Error("Invalid movie URL");
      
      const { titlePattern, year } = parsedSlug;
      
      // Split title pattern into individual words for better matching
      const words = titlePattern.split(' ').filter(w => w.length > 0);
      
      // Build query with multiple ilike conditions for each word
      let query = supabase
        .from("movies")
        .select("*")
        .eq("year", year);
      
      // Add ilike condition for each word to handle special characters
      words.forEach(word => {
        query = query.ilike("title", `%${word}%`);
      });

      const { data: movies, error } = await query;

      if (error) throw error;
      if (!movies || movies.length === 0) throw new Error("Movie not found");

      // Normalize title for exact matching (handles special characters)
      const normalizedPattern = titlePattern.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find best match by normalized title
      const movie = movies.find(m => 
        m.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedPattern
      ) || movies[0];

      return movie;
    },
    enabled: !!parsedSlug,
  });

  // Fetch similar movies for carousel
  const { data: similarMovies, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similarMovies", movie?.id],
    queryFn: async () => {
      if (!movie?.id) return [];
      return await getSimilarMovies(movie.id, 6);
    },
    enabled: !!movie?.id,
  });

  // Load user rating
  useEffect(() => {
    const loadRating = async () => {
      if (!movie?.id) return;

      if (user) {
        const { data } = await supabase
          .from("user_ratings")
          .select("user_rating")
          .eq("user_id", user.id)
          .eq("media_id", movie.id)
          .eq("media_type", "movie")
          .maybeSingle();

        if (data?.user_rating) {
          setCurrentRating(data.user_rating);
        } else {
          setCurrentRating(null);
        }
      } else {
        const guestRatings = getGuestRatings();
        const guestRating = guestRatings.find((r) => r.movieId === movie.id);
        if (guestRating) {
          setCurrentRating(guestRating.rating);
        } else {
          setCurrentRating(null);
        }
      }
    };

    loadRating();
  }, [movie?.id, user]);

  const handleRate = async (ratingValue: number) => {
    if (!movie?.id) return;
    setSaving(true);

    try {
      if (user) {
        const { error } = await supabase.from("user_ratings").upsert(
          {
            user_id: user.id,
            media_id: movie.id,
            media_type: "movie",
            user_rating: ratingValue,
          },
          {
            onConflict: "user_id,media_id,media_type",
          },
        );

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["userRatings"] });
      } else {
        saveGuestRating(movie.id, ratingValue);
      }

      setCurrentRating(ratingValue);

      const messages = {
        1: "Marked as not for me",
        5: "👍 I liked this!",
        10: "❤️ Love this!",
      };

      toast({
        title: messages[ratingValue as keyof typeof messages],
      });
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error saving rating",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const imageProps = movie ? getOptimizedImageProps(movie.poster, movie.local_poster_url) : null;
  const hasValidImdbId = movie?.imdb_id && movie.imdb_id.startsWith("tt");
  const imdbUrl = hasValidImdbId ? `https://www.imdb.com/title/${movie.imdb_id}/` : "";
  const googleSearchUrl = movie
    ? `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}`
    : "";
  
  // Generate SEO data
  const movieSEO = movie ? {
    title: `${movie.title} (${movie.year}) - ${movie.imdb_rating || movie.rating ? `IMDb ${movie.imdb_rating || movie.rating}/10` : ''} | CineMatch`,
    description: movie.plot 
      ? `${movie.plot.substring(0, 140)}... ${movie.director ? `Directed by ${movie.director}.` : ''} ${movie.genres?.join(', ') || ''}`
      : `Watch ${movie.title} (${movie.year}). ${movie.genres?.join(', ') || 'Movie'} ${movie.director ? `directed by ${movie.director}` : ''}.`,
    image: imageProps?.src || undefined,
    imageAlt: `${movie.title} (${movie.year}) movie poster`,
  } : null;

  const movieSchema = movie ? generateMovieSchema({
    title: movie.title,
    year: movie.year,
    plot: movie.plot || undefined,
    poster: imageProps?.src || movie.poster || undefined,
    genres: movie.genres || undefined,
    director: movie.director || undefined,
    actors: movie.actors || undefined,
    imdbRating: movie.imdb_rating || undefined,
    imdbVotes: movie.imdb_votes || undefined,
    rating: movie.rating || undefined,
    voteCount: movie.vote_count || undefined,
    runtime: movie.runtime || undefined,
    releaseDate: movie.year ? `${movie.year}-01-01` : undefined,
    imdbId: movie.imdb_id || undefined,
  }) : null;

  const breadcrumbSchema = movie ? generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Movies', url: '/movies' },
    { name: movie.title, url: `/movie/${slug}` },
  ]) : null;
  
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Parse watch providers
  const parseWatchProviders = (providers: any) => {
    if (!providers) return null;

    const regions = providers.results || providers;
    const region = regions["US"] || regions["GB"] || Object.values(regions)[0];
    if (!region || typeof region !== "object") return null;
    return {
      flatrate: (region as any).flatrate || [],
      rent: (region as any).rent || [],
      buy: (region as any).buy || [],
    };
  };
  const watchProviders = movie ? parseWatchProviders(movie.watch_providers) : null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="flex gap-6">
          <Skeleton className="w-64 h-96" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Movie Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The movie you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate("/movies")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Movies
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {movieSEO && (
        <SEOHead
          title={movieSEO.title}
          description={movieSEO.description}
          image={movieSEO.image}
          imageAlt={movieSEO.imageAlt}
          type="video.movie"
          schema={movieSchema ? { ...movieSchema, ...{ breadcrumb: breadcrumbSchema } } : undefined}
        />
      )}
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/movies" className="hover:text-foreground transition-colors">
            Movies
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{movie.title}</span>
        </nav>

        <ScrollArea className="h-[calc(100vh-150px)]">
          <div className="pr-4">
            {/* Movie Header Section */}
            <div className="flex gap-6 mb-6">
              {/* Poster */}
              {imageProps && (
                <div className="w-64 flex-shrink-0">
                  <img {...imageProps} alt={movie.title} className="w-full rounded-lg shadow-2xl" />
                </div>
              )}

              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
                
                {movie.tagline && (
                  <p className="text-lg text-muted-foreground italic mb-4">"{movie.tagline}"</p>
                )}

                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Link to={getYearUrl(movie.year)}>
                    <Badge variant="secondary" className="text-sm px-3 py-1 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                      <Calendar className="h-4 w-4 mr-1" />
                      {movie.year}
                    </Badge>
                  </Link>
                  {movie.runtime && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Film className="h-4 w-4 mr-1" />
                      {movie.runtime}
                    </Badge>
                  )}
                  {(movie.imdb_rating || movie.rating) && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Star className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                      {movie.imdb_rating || movie.rating}/10
                    </Badge>
                  )}
                  {movie.original_language && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      <Globe className="h-4 w-4 mr-1" />
                      {movie.original_language.toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentRating === 1 ? "default" : "secondary"}
                          onClick={() => handleRate(1)}
                          disabled={saving}
                          className="flex-1"
                        >
                          <ThumbsDown className={`h-4 w-4 mr-2 ${currentRating === 1 ? "fill-current" : ""}`} />
                          Not for me
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Not for me</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentRating === 5 ? "default" : "secondary"}
                          onClick={() => handleRate(5)}
                          disabled={saving}
                          className="flex-1"
                        >
                          <ThumbsUp className={`h-4 w-4 mr-2 ${currentRating === 5 ? "fill-current" : ""}`} />
                          I like it
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>I like it</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentRating === 10 ? "default" : "secondary"}
                          onClick={() => handleRate(10)}
                          disabled={saving}
                          className="flex-1"
                        >
                          <Heart className={`h-4 w-4 mr-2 ${currentRating === 10 ? "fill-current" : ""}`} />
                          Love it!
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Love it!</TooltipContent>
                    </Tooltip>

                    <MovieWatchlist
                      movieId={movie.id}
                      movieTitle={movie.title}
                      iconOnly={false}
                    />
                  </TooltipProvider>
                </div>

                {/* Plot */}
                {movie.plot && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Overview</h3>
                    <p className="text-muted-foreground leading-relaxed">{movie.plot}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <Button variant="outline" onClick={() => navigate("/movies")} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Movies
            </Button>

            {/* Tabs for Organized Content */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="cast">Cast</TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Genres
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((g) => (
                        <Link key={g} to={getGenreUrl(g)}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {g}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* External Links */}
                <Card className="p-4">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Links
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {hasValidImdbId && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          IMDb
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                        <Search className="h-3 w-3 mr-1" />
                        Google
                      </a>
                    </Button>
                  </div>
                </Card>

                {/* Awards */}
                {movie.awards && movie.awards !== "N/A" && (
                  <Card className="p-4 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Awards
                    </h4>
                    <p className="text-sm">{movie.awards}</p>
                  </Card>
                )}

                {/* Financial Info */}
                {(movie.budget || movie.revenue || movie.box_office) && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Box Office
                    </h4>
                    <div className="space-y-2">
                      {movie.budget && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Budget</span>
                          <span className="text-sm font-semibold">{formatCurrency(movie.budget)}</span>
                        </div>
                      )}
                      {movie.revenue && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Revenue</span>
                          <span className="text-sm font-semibold">{formatCurrency(movie.revenue)}</span>
                        </div>
                      )}
                      {movie.box_office && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Box Office</span>
                          <span className="text-sm font-semibold">{movie.box_office}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Watch Providers */}
                {watchProviders &&
                  (watchProviders.flatrate.length > 0 ||
                    watchProviders.rent.length > 0 ||
                    watchProviders.buy.length > 0) && (
                    <Card className="p-4">
                      <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        Where to Watch
                      </h4>
                      <div className="space-y-2">
                        {watchProviders.flatrate.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Streaming</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.flatrate.map((provider: any) => (
                                <Link key={provider.provider_id} to={getStreamingUrl(provider.provider_name)}>
                                  <div className="text-xs bg-muted rounded px-2 py-1 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                                    {provider.provider_name}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                        {watchProviders.rent.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Rent</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.rent.map((provider: any) => (
                                <div
                                  key={provider.provider_id}
                                  className="text-xs bg-muted rounded px-2 py-1"
                                >
                                  {provider.provider_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {watchProviders.buy.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Buy</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.buy.map((provider: any) => (
                                <div
                                  key={provider.provider_id}
                                  className="text-xs bg-muted rounded px-2 py-1"
                                >
                                  {provider.provider_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
              </TabsContent>

              {/* Cast & Crew Tab */}
              <TabsContent value="cast" className="space-y-4">
                {/* Director */}
                {movie.director && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Director
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.director.split(",").map((d) => (
                        <Link key={d.trim()} to={getPersonUrl(d.trim())}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {d.trim()}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Writers */}
                {movie.writing && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Writers
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.writing.split(",").map((writer) => (
                        <Link key={writer.trim()} to={getPersonUrl(writer.trim())}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {writer.trim()}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Cast */}
                {movie.actors && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Cast
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.actors
                        .split(",")
                        .slice(0, 15)
                        .map((actor) => (
                          <Link key={actor.trim()} to={getPersonUrl(actor.trim())}>
                            <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                              {actor.trim()}
                            </Badge>
                          </Link>
                        ))}
                    </div>
                  </Card>
                )}

                {/* Sound */}
                {movie.sound && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Sound
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.sound.split(",").map((s) => (
                        <Badge key={s.trim()} variant="outline">
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* More Tab */}
              <TabsContent value="more" className="space-y-4">
                {/* Keywords */}
                {movie.keywords && movie.keywords.length > 0 && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                      Keywords
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.keywords.slice(0, 20).map((keyword) => (
                        <Link key={keyword} to={getKeywordUrl(keyword)}>
                          <Badge variant="outline" className="text-xs hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {keyword}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Production Companies */}
                {movie.production_companies && Array.isArray(movie.production_companies) && movie.production_companies.length > 0 && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      Production Companies
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.production_companies.map((company: any, idx: number) => (
                        <Link key={idx} to={getCompanyUrl(company.name)}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {company.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Production Countries */}
                {movie.production_countries && Array.isArray(movie.production_countries) && movie.production_countries.length > 0 && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Production Countries
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.production_countries.map((country: any, idx: number) => (
                        <Link key={idx} to={getCountryUrl(country.name)}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {country.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Spoken Languages */}
                {movie.spoken_languages && Array.isArray(movie.spoken_languages) && movie.spoken_languages.length > 0 && (
                  <Card className="p-4">
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Languages className="h-4 w-4" />
                      Spoken Languages
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {movie.spoken_languages.map((lang: any, idx: number) => (
                        <Link key={idx} to={getLanguageUrl(lang.english_name || lang.name)}>
                          <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                            {lang.english_name || lang.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Similar Movies Carousel */}
            {similarMovies && similarMovies.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Similar Movies</h3>
                <Carousel className="w-full">
                  <CarouselContent>
                    {similarMovies.map((similarMovie) => {
                      const similarImageProps = getOptimizedImageProps(
                        similarMovie.poster,
                        similarMovie.local_poster_url
                      );
                      return (
                        <CarouselItem key={similarMovie.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                          <Link to={getMovieUrl(similarMovie.title, similarMovie.year)}>
                            <Card className="overflow-hidden hover:ring-2 ring-primary transition-all cursor-pointer">
                              {similarImageProps && (
                                <img
                                  {...similarImageProps}
                                  alt={similarMovie.title}
                                  className="w-full aspect-[2/3] object-cover"
                                />
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium line-clamp-2">{similarMovie.title}</p>
                                <p className="text-xs text-muted-foreground">{similarMovie.year}</p>
                              </div>
                            </Card>
                          </Link>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MovieDetail;
