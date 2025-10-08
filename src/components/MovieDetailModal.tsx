import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  ExternalLink,
  Search,
  Users,
  Globe,
  Info,
  DollarSign,
  Calendar,
  Film,
  Languages,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { MovieWatchlist } from "@/components/MovieWatchlist";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffectiveAuth } from "@/contexts/DevModeContext";
import { saveGuestRating, getGuestRatings } from "@/lib/guestRatings";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getSimilarMovies } from "@/lib/recommendationEngine";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
export const MovieDetailModal = () => {
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useEffectiveAuth();
  
  // Debug: Log location state
  console.log('[MovieDetailModal] Mounted with location.state:', location.state);
  
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: movie,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["movie", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("movies").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Movie not found");
      return data;
    },
    enabled: !!id,
  });

  // Fetch similar movies
  const { data: similarMovies, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similarMovies", id],
    queryFn: async () => {
      if (!id) return [];
      return await getSimilarMovies(id, 6);
    },
    enabled: !!id,
  });
  // Load user rating
  useEffect(() => {
    const loadRating = async () => {
      if (!id) return;
      
      if (user) {
        const { data } = await supabase
          .from('user_ratings')
          .select('user_rating')
          .eq('user_id', user.id)
          .eq('media_id', id)
          .eq('media_type', 'movie')
          .maybeSingle();
        
        if (data?.user_rating) {
          setCurrentRating(data.user_rating);
        }
      } else {
        const guestRatings = getGuestRatings();
        const guestRating = guestRatings.find(r => r.movieId === id);
        if (guestRating) {
          setCurrentRating(guestRating.rating);
        }
      }
    };
    
    loadRating();
  }, [id, user]);

  const handleRate = async (ratingValue: number) => {
    if (!id || !movie) return;
    setSaving(true);
    
    try {
      if (user) {
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: user.id,
            media_id: id,
            media_type: 'movie',
            user_rating: ratingValue,
          }, {
            onConflict: 'user_id,media_id,media_type'
          });

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['userRatings'] });
      } else {
        saveGuestRating(id, ratingValue);
      }
      
      setCurrentRating(ratingValue);
      
      const messages = {
        1: "Marked as not for me",
        5: "👍 I liked this!",
        10: "❤️ Love this!"
      };
      
      toast({
        title: messages[ratingValue as keyof typeof messages],
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: "Error saving rating",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    console.log('[MovieDetailModal] Close clicked, location.state:', location.state);
    
    if (location.state?.backgroundLocation) {
      const bg = location.state.backgroundLocation;
      const targetPath = `${bg.pathname}${bg.search || ''}`;
      console.log('[MovieDetailModal] Navigating to:', targetPath);
      navigate(targetPath, { replace: true });
    } else {
      console.log('[MovieDetailModal] No backgroundLocation, going home');
      navigate("/");
    }
  };

  const handlePrevious = () => {
    const moviesList = location.state?.moviesList;
    const currentIndex = location.state?.currentIndex;
    
    console.log('[MovieDetailModal] Previous clicked, state:', { moviesList, currentIndex });
    
    if (moviesList && currentIndex !== undefined && currentIndex > 0) {
      const prevMovie = moviesList[currentIndex - 1];
      navigate(`/movie/${prevMovie.id}`, {
        state: {
          ...location.state,
          currentIndex: currentIndex - 1
        },
        replace: true
      });
    }
  };

  const handleNext = () => {
    const moviesList = location.state?.moviesList;
    const currentIndex = location.state?.currentIndex;
    
    console.log('[MovieDetailModal] Next clicked, state:', { moviesList, currentIndex });
    
    if (moviesList && currentIndex !== undefined && currentIndex < moviesList.length - 1) {
      const nextMovie = moviesList[currentIndex + 1];
      navigate(`/movie/${nextMovie.id}`, {
        state: {
          ...location.state,
          currentIndex: currentIndex + 1
        },
        replace: true
      });
    }
  };
  const imageProps = movie ? getOptimizedImageProps(movie.poster) : null;
  const hasValidImdbId = movie?.imdb_id && movie.imdb_id.startsWith("tt");
  const imdbUrl = hasValidImdbId ? `https://www.imdb.com/title/${movie.imdb_id}/` : "";
  const googleSearchUrl = movie
    ? `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}`
    : "";
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Navigation handlers for internal linking
  const handleFieldClick = (filterType: "year" | "genre" | "language" | "search", value: string | number) => {
    const params = new URLSearchParams();
    if (filterType === "year" && typeof value === "number") {
      params.set("year", `${value}-${value}`);
    } else if (filterType === "genre" && typeof value === "string") {
      params.set("genres", value);
    } else if (filterType === "language" && typeof value === "string") {
      params.set("languages", value);
    } else if (filterType === "search" && typeof value === "string") {
      params.set("search", value);
    }

    // Navigate to movies page with filter params
    navigate(`/movies?${params.toString()}`);

    // Close modal after a short delay
    setTimeout(() => {
      handleClose();
    }, 50);
  };

  // Parse watch providers
  const parseWatchProviders = (providers: any) => {
    if (!providers) return null;

    // Check if providers has a 'results' key (TMDB structure)
    const regions = providers.results || providers;

    // Try to get US region first, or first available region
    const region = regions["US"] || regions["GB"] || Object.values(regions)[0];
    if (!region || typeof region !== "object") return null;
    return {
      flatrate: (region as any).flatrate || [],
      rent: (region as any).rent || [],
      buy: (region as any).buy || [],
    };
  };
  const watchProviders = movie ? parseWatchProviders(movie.watch_providers) : null;
  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-destructive mb-2">Movie Not Found</h2>
            <p className="text-muted-foreground">The movie you're looking for doesn't exist or has been removed.</p>
          </div>
        ) : movie ? (
          <>
            {/* Hero Section with Poster */}
            <div className="relative overflow-hidden bg-gradient-to-b from-background/50 to-background">
              {imageProps && (
                <img
                  {...imageProps}
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />

              <div className="relative p-8">
                <div className="flex gap-6 items-start">
                  {/* Poster */}
                  {imageProps && (
                    <div className="hidden md:block w-48 rounded-lg overflow-hidden shadow-2xl flex-shrink-0">
                      <img {...imageProps} alt={movie.title} className="w-full h-auto" />
                    </div>
                  )}

                  {/* Title & Quick Info */}
                  <div className="flex-1 space-y-3">
                    <DialogHeader>
                      <DialogTitle className="text-4xl font-bold">{movie.title}</DialogTitle>
                      {movie.tagline && <p className="text-lg text-muted-foreground italic">"{movie.tagline}"</p>}
                    </DialogHeader>

                    {/* Plot - Right after tagline */}
                    {movie.plot && (
                      <div className="mb-2">
                        <p className="text-sm leading-relaxed text-muted-foreground">{movie.plot}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="text-sm cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleFieldClick("year", movie.year)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {movie.year}
                      </Badge>
                      {movie.runtime && (
                        <Badge variant="secondary" className="text-sm">
                          <Film className="h-3 w-3 mr-1" />
                          {movie.runtime}
                        </Badge>
                      )}
                      {movie.original_language && (
                        <Badge
                          variant="secondary"
                          className="text-sm cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleFieldClick("language", movie.original_language)}
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          {movie.original_language.toUpperCase()}
                        </Badge>
                      )}
                      {movie.status && (
                        <Badge variant="outline" className="text-sm">
                          {movie.status}
                        </Badge>
                      )}
                    </div>

                    {/* Stats and Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* IMDb Rating (prioritized when available) */}
                        {movie.imdb_rating ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                            <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                            <div className="text-2xl font-bold">{movie.imdb_rating}/10</div>
                            <div className="text-xs text-muted-foreground">IMDb</div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                            <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                            <div className="text-2xl font-bold">{movie.rating}/10</div>
                            <div className="text-xs text-muted-foreground">TMDB</div>
                          </div>
                        )}

                        {!movie.imdb_rating && movie.vote_count && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-5 w-5" />
                            <span>{movie.vote_count.toLocaleString()} votes</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {hasValidImdbId && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              IMDB
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                            <Search className="h-3 w-3 mr-1" />
                            Google
                          </a>
                        </Button>
                        <MovieWatchlist movieId={movie.id} movieTitle={movie.title} iconOnly={true} />
                        
                        {/* Inline Rating Buttons */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant={currentRating === 1 ? "default" : "outline"}
                                onClick={() => handleRate(1)}
                                disabled={saving}
                                className="h-9 w-9"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Not for me</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant={currentRating === 5 ? "default" : "outline"}
                                onClick={() => handleRate(5)}
                                disabled={saving}
                                className="h-9 w-9"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>I liked this</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant={currentRating === 10 ? "default" : "outline"}
                                onClick={() => handleRate(10)}
                                disabled={saving}
                                className="h-9 w-9"
                              >
                                <Heart className="h-4 w-4 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Love this!</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous/Next Navigation Bar */}
            {(() => {
              const hasMoviesList = location.state?.moviesList && Array.isArray(location.state.moviesList) && location.state.moviesList.length > 0;
              const hasCurrentIndex = location.state?.currentIndex !== undefined && location.state?.currentIndex !== null;
              
              console.log('[MovieDetailModal] Nav bar check:', { 
                hasMoviesList, 
                hasCurrentIndex,
                moviesListLength: location.state?.moviesList?.length,
                currentIndex: location.state?.currentIndex,
                fullState: location.state
              });
              
              return hasMoviesList && hasCurrentIndex ? (
                <div className="flex items-center justify-between px-8 py-3 border-b bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={location.state.currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <span className="text-xs text-muted-foreground">
                    {location.state.currentIndex + 1} of {location.state.moviesList.length}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={location.state.currentIndex === location.state.moviesList.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : null;
            })()}

            {/* Content Section */}
            <ScrollArea className="max-h-[400px] p-8 pt-6">
              <div className="space-y-6">
                {/* Awards Section */}
                {movie.awards && movie.awards !== "N/A" && (
                  <div className="rounded-lg border p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                      🏆 Awards & Recognition
                    </h4>
                    <p className="text-sm">{movie.awards}</p>
                  </div>
                )}

                {/* Financial Info */}
                {(movie.budget || movie.revenue || movie.box_office) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {movie.budget && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Budget
                        </h4>
                        <p className="text-2xl font-bold">{formatCurrency(movie.budget)}</p>
                      </div>
                    )}
                    {movie.revenue && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Revenue
                        </h4>
                        <p className="text-2xl font-bold">{formatCurrency(movie.revenue)}</p>
                      </div>
                    )}
                    {movie.box_office && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Box Office
                        </h4>
                        <p className="text-2xl font-bold">{movie.box_office}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Crew Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.director && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        Director
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.director.split(",").map((d) => (
                          <Badge
                            key={d.trim()}
                            variant="secondary"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", d.trim())}
                          >
                            {d.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {movie.writing && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        Writers
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.writing.split(",").map((writer) => (
                          <Badge
                            key={writer.trim()}
                            variant="secondary"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", writer.trim())}
                          >
                            {writer.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cast */}
                {movie.actors && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Cast</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.actors
                        .split(",")
                        .slice(0, 15)
                        .map((actor) => (
                          <Badge
                            key={actor.trim()}
                            variant="secondary"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", actor.trim())}
                          >
                            {actor.trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sound Department */}
                {movie.sound && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                      Sound Department
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.sound
                        .split(",")
                        .slice(0, 10)
                        .map((person) => (
                          <Badge
                            key={person.trim()}
                            variant="outline"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", person.trim())}
                          >
                            {person.trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Genres & Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        Genres
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.genres.map((g) => (
                          <Badge
                            key={g}
                            variant="secondary"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("genre", g)}
                          >
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {movie.keywords && movie.keywords.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        Keywords
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="outline"
                            className="text-xs cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", keyword)}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Production Companies */}
                {movie.production_companies &&
                  Array.isArray(movie.production_companies) &&
                  movie.production_companies.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                        Production Companies
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.production_companies.map((company: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleFieldClick("search", company.name || company)}
                          >
                            {company.name || company}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Production Countries & Languages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.production_countries &&
                    Array.isArray(movie.production_countries) &&
                    movie.production_countries.length > 0 && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                          Production Countries
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {movie.production_countries.map((country: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => handleFieldClick("search", country.name || country)}
                            >
                              {country.name || country}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {movie.spoken_languages &&
                    Array.isArray(movie.spoken_languages) &&
                    movie.spoken_languages.length > 0 && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Spoken Languages
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {movie.spoken_languages.map((lang: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => lang.iso_639_1 && handleFieldClick("language", lang.iso_639_1)}
                            >
                              {lang.english_name || lang.name || lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Watch Providers */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Where to Watch
                  </h4>
                  {watchProviders ? (
                    <div className="space-y-3">
                      {watchProviders.flatrate && watchProviders.flatrate.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Streaming</p>
                          <div className="flex flex-wrap gap-2">
                            {watchProviders.flatrate.map((provider: any, index: number) => (
                              <Badge key={index} variant="secondary" className="gap-2">
                                {provider.logo_path && (
                                  <img
                                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    className="w-4 h-4 rounded"
                                  />
                                )}
                                {provider.provider_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {watchProviders.rent && watchProviders.rent.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Rent</p>
                          <div className="flex flex-wrap gap-2">
                            {watchProviders.rent.map((provider: any, index: number) => (
                              <Badge key={index} variant="outline" className="gap-2">
                                {provider.logo_path && (
                                  <img
                                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    className="w-4 h-4 rounded"
                                  />
                                )}
                                {provider.provider_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {watchProviders.buy && watchProviders.buy.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Buy</p>
                          <div className="flex flex-wrap gap-2">
                            {watchProviders.buy.map((provider: any, index: number) => (
                              <Badge key={index} variant="outline" className="gap-2">
                                {provider.logo_path && (
                                  <img
                                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    className="w-4 h-4 rounded"
                                  />
                                )}
                                {provider.provider_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">Availability varies by region</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No streaming information available.</p>
                      {hasValidImdbId && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                            Check IMDB for Availability
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Similar Movies */}
                {similarMovies && similarMovies.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Similar Movies You Might Like
                    </h4>
                    {loadingSimilar ? (
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="min-w-[120px] h-[180px] rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <Carousel opts={{ align: "start", loop: false }} className="w-full">
                          <CarouselContent className="-ml-2">
                            {similarMovies.map((similar) => {
                              const similarImageProps = getOptimizedImageProps(similar.poster);
                              return (
                                <CarouselItem key={similar.id} className="pl-2 basis-1/3 md:basis-1/4 lg:basis-1/6">
                                  <Card
                                    className="overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => {
                                      handleClose();
                                      setTimeout(() => navigate(`/movie/${similar.id}`), 100);
                                    }}
                                  >
                                    <div className="aspect-[2/3] relative">
                                      <img
                                        {...similarImageProps}
                                        alt={similar.title}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="text-xs">
                                          <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                                          {(similar as any).imdbRating
                                            ? (similar as any).imdbRating.toFixed(1)
                                            : similar.rating.toFixed(1)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      <p className="text-xs font-medium line-clamp-2">{similar.title}</p>
                                      <p className="text-xs text-muted-foreground">{similar.year}</p>
                                    </div>
                                  </Card>
                                </CarouselItem>
                              );
                            })}
                          </CarouselContent>
                          <CarouselPrevious className="left-0" />
                          <CarouselNext className="right-0" />
                        </Carousel>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
