import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  ArrowLeft,
  ChevronRight,
  Award,
  Briefcase,
  Play,
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
import { getRecentlyShownMovieIds, markMoviesAsShown } from "@/lib/recentlyShownTracker";

interface MovieDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string | null;
  onNavigateToMovie?: (movieId: string) => void;
}

export const MovieDetailModal = ({ isOpen, onClose, movieId, onNavigateToMovie }: MovieDetailModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useEffectiveAuth();
  
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingNextMovie, setLoadingNextMovie] = useState(false);
  const [movieHistory, setMovieHistory] = useState<string[]>([]);
  const [relevanceReason, setRelevanceReason] = useState<string>("");

  // Track movie history
  useEffect(() => {
    if (movieId && isOpen) {
      setMovieHistory(prev => {
        // If this is a new movie (not going back), add to history
        if (prev.length === 0 || prev[prev.length - 1] !== movieId) {
          return [...prev, movieId];
        }
        return prev;
      });
    }
  }, [movieId, isOpen]);

  // Clear history when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMovieHistory([]);
    }
  }, [isOpen]);

  const {
    data: movie,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      if (!movieId) return null;
      const { data, error } = await supabase.from("movies").select("*").eq("id", movieId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Movie not found");
      return data;
    },
    enabled: !!movieId && isOpen,
  });

  // Fetch similar movies (20 for next movie feature, display 6 in carousel)
  const { data: similarMovies, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similarMovies", movieId],
    queryFn: async () => {
      if (!movieId) return [];
      return await getSimilarMovies(movieId, 20);
    },
    enabled: !!movieId && isOpen,
  });
  
  // Load user rating
  useEffect(() => {
    const loadRating = async () => {
      if (!movieId || !isOpen) return;
      
      if (user) {
        const { data } = await supabase
          .from('user_ratings')
          .select('user_rating')
          .eq('user_id', user.id)
          .eq('media_id', movieId)
          .eq('media_type', 'movie')
          .maybeSingle();
        
        if (data?.user_rating) {
          setCurrentRating(data.user_rating);
        } else {
          setCurrentRating(null);
        }
      } else {
        const guestRatings = getGuestRatings();
        const guestRating = guestRatings.find(r => r.movieId === movieId);
        if (guestRating) {
          setCurrentRating(guestRating.rating);
        } else {
          setCurrentRating(null);
        }
      }
    };
    
    loadRating();
  }, [movieId, user, isOpen]);

  // Calculate relevance reason
  useEffect(() => {
    const calculateRelevance = async () => {
      if (!movieId || !movie || !isOpen) {
        setRelevanceReason("");
        return;
      }

      try {
        // Fetch user's highly rated movies (rating >= 5)
        let ratedMovies: any[] = [];
        
        if (user) {
          const { data } = await supabase
            .from('user_ratings')
            .select('media_id, user_rating')
            .eq('user_id', user.id)
            .eq('media_type', 'movie')
            .gte('user_rating', 5);
          
          if (data && data.length > 0) {
            const movieIds = data.map(r => r.media_id);
            const { data: moviesData } = await supabase
              .from('movies')
              .select('genres, director, actors, keywords')
              .in('id', movieIds);
            
            ratedMovies = moviesData || [];
          }
        } else {
          // For guest users
          const guestRatings = getGuestRatings().filter(r => r.rating >= 5);
          if (guestRatings.length > 0) {
            const movieIds = guestRatings.map(r => r.movieId);
            const { data: moviesData } = await supabase
              .from('movies')
              .select('genres, director, actors, keywords')
              .in('id', movieIds);
            
            ratedMovies = moviesData || [];
          }
        }

        if (ratedMovies.length === 0) {
          setRelevanceReason("This movie matches popular preferences and high ratings");
          return;
        }

        // Calculate matches
        const reasons: string[] = [];
        const movieGenres = movie.genres || [];
        const movieDirector = movie.director || '';
        const movieActors = (movie.actors || '').split(', ').filter(a => a);
        const movieKeywords = movie.keywords || [];

        // Check genre matches
        const likedGenres = new Set<string>();
        ratedMovies.forEach(m => {
          (m.genres || []).forEach((g: string) => likedGenres.add(g));
        });
        const matchedGenres = movieGenres.filter(g => likedGenres.has(g));
        if (matchedGenres.length > 0) {
          reasons.push(`You enjoyed ${matchedGenres.slice(0, 2).join(', ')} movies`);
        }

        // Check director matches
        const likedDirectors = new Set(ratedMovies.map(m => m.director).filter(Boolean));
        if (movieDirector && likedDirectors.has(movieDirector)) {
          reasons.push(`You liked movies by ${movieDirector}`);
        }

        // Check actor matches
        const likedActors = new Set<string>();
        ratedMovies.forEach(m => {
          (m.actors || '').split(', ').filter((a: string) => a).forEach((a: string) => likedActors.add(a));
        });
        const matchedActors = movieActors.filter(a => likedActors.has(a));
        if (matchedActors.length > 0) {
          reasons.push(`Features ${matchedActors[0]} from your favorites`);
        }

        // Check keyword matches
        const likedKeywords = new Set<string>();
        ratedMovies.forEach(m => {
          (m.keywords || []).forEach((k: string) => likedKeywords.add(k));
        });
        const matchedKeywords = movieKeywords.filter(k => likedKeywords.has(k));
        if (matchedKeywords.length > 0) {
          reasons.push(`Similar themes: ${matchedKeywords.slice(0, 2).join(', ')}`);
        }

        if (reasons.length > 0) {
          setRelevanceReason(reasons.slice(0, 3).join(' • '));
        } else {
          setRelevanceReason("Recommended based on your viewing preferences");
        }
      } catch (error) {
        console.error('Error calculating relevance:', error);
        setRelevanceReason("");
      }
    };

    calculateRelevance();
  }, [movieId, movie, user, isOpen]);

  const handleRate = async (ratingValue: number) => {
    if (!movieId || !movie) return;
    setSaving(true);
    
    try {
      if (user) {
        const { error } = await supabase
          .from('user_ratings')
          .upsert({
            user_id: user.id,
            media_id: movieId,
            media_type: 'movie',
            user_rating: ratingValue,
          }, {
            onConflict: 'user_id,media_id,media_type'
          });

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['userRatings'] });
      } else {
        saveGuestRating(movieId, ratingValue);
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
    
    // Auto-navigate to next similar movie after rating
    setTimeout(() => {
      handleNextSimilarMovie();
    }, 800);
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

  // Fetch next similar movie that hasn't been shown
  const fetchNextSimilarMovie = async () => {
    if (!movieId || !similarMovies) return null;
    
    // Get exclusion lists
    const recentlyShownIds = getRecentlyShownMovieIds();
    const ratedMovieIds = new Set<string>();
    const watchlistIds = new Set<string>();
    
    if (user) {
      const { data: ratings } = await supabase
        .from('user_ratings')
        .select('media_id, in_watchlist, user_rating')
        .eq('user_id', user.id)
        .eq('media_type', 'movie');
      
      ratings?.forEach(r => {
        if (r.user_rating !== null) ratedMovieIds.add(r.media_id);
        if (r.in_watchlist) watchlistIds.add(r.media_id);
      });
    } else {
      const guestRatings = getGuestRatings();
      guestRatings.forEach(r => ratedMovieIds.add(r.movieId));
    }
    
    // Filter out exclusions
    const availableMovies = similarMovies.filter(m => 
      m.id !== movieId &&
      !recentlyShownIds.includes(m.id) &&
      !ratedMovieIds.has(m.id) &&
      !watchlistIds.has(m.id)
    );
    
    return availableMovies[0] || null;
  };

  // Handle next similar movie button
  const handleNextSimilarMovie = async () => {
    if (!movieId) return;
    setLoadingNextMovie(true);
    
    try {
      const nextMovie = await fetchNextSimilarMovie();
      
      if (nextMovie) {
        // Mark current movie as shown
        markMoviesAsShown([movieId]);
        
        // Navigate to next movie
        if (onNavigateToMovie) {
          onNavigateToMovie(nextMovie.id);
          toast({
            title: "Next Movie",
            description: `Now viewing: ${nextMovie.title}`,
          });
        }
      } else {
        toast({
          title: "No more similar movies",
          description: "Try exploring from the recommendations page!",
        });
      }
    } catch (error) {
      console.error('Error fetching next similar movie:', error);
      toast({
        title: "Error loading next movie",
        variant: "destructive",
      });
    } finally {
      setLoadingNextMovie(false);
    }
  };

  // Handle previous movie button
  const handlePreviousMovie = () => {
    if (movieHistory.length <= 1) return;
    
    // Remove current movie from history
    const newHistory = [...movieHistory];
    newHistory.pop();
    
    // Get previous movie
    const previousMovieId = newHistory[newHistory.length - 1];
    
    // Update history state
    setMovieHistory(newHistory);
    
    // Navigate to previous movie
    if (onNavigateToMovie) {
      onNavigateToMovie(previousMovieId);
    }
  };

  const canGoBack = movieHistory.length > 1;

  const imageProps = movie ? getOptimizedImageProps(movie.poster, movie.local_poster_url) : null;
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none p-0 gap-0 sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="p-6">
            <h2 className="text-xl font-bold text-destructive mb-2">Movie Not Found</h2>
            <p className="text-sm text-muted-foreground">The movie you're looking for doesn't exist or has been removed.</p>
          </div>
        ) : movie ? (
          <ScrollArea className="h-full">
            {/* Portrait Poster & Header Section */}
            <div className="p-3 sm:p-6">
              <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Portrait Poster */}
                {imageProps && (
                  <div className="w-24 sm:w-32 flex-shrink-0">
                    <img
                      {...imageProps}
                      alt={movie.title}
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                )}
                
                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <h2 className="text-base sm:text-2xl font-bold leading-tight">{movie.title}</h2>
                    {relevanceReason && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p className="font-semibold mb-1">Why this movie?</p>
                            <p>{relevanceReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  {movie.tagline && (
                    <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-2 mb-2">"{movie.tagline}"</p>
                  )}

                  {/* Quick Info Badges */}
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-5 sm:h-auto">
                      <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      {movie.year}
                    </Badge>
                    {movie.runtime && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-5 sm:h-auto">
                        <Film className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        {movie.runtime}
                      </Badge>
                    )}
                    {(movie.imdb_rating || movie.rating) && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-5 sm:h-auto">
                        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 fill-yellow-500 text-yellow-500" />
                        {movie.imdb_rating || movie.rating}/10
                      </Badge>
                    )}
                    {movie.original_language && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-5 sm:h-auto">
                        <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        {movie.original_language.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <TooltipProvider>
                      <div className="flex gap-1 sm:gap-2 flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={currentRating === 1 ? "default" : "secondary"}
                              onClick={() => handleRate(1)}
                              disabled={saving}
                              className="flex-1 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                            >
                              <ThumbsDown className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 ${currentRating === 1 ? 'fill-current' : ''}`} />
                              <span className="hidden sm:inline">Not for me</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Not for me</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={currentRating === 5 ? "default" : "secondary"}
                              onClick={() => handleRate(5)}
                              disabled={saving}
                              className="flex-1 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                            >
                              <ThumbsUp className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 ${currentRating === 5 ? 'fill-current' : ''}`} />
                              <span className="hidden sm:inline">I like it</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">I like it</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={currentRating === 10 ? "default" : "secondary"}
                              onClick={() => handleRate(10)}
                              disabled={saving}
                              className="flex-1 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
                            >
                              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 ${currentRating === 10 ? 'fill-current' : ''}`} />
                              <span className="hidden sm:inline">Love it!</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Love it!</TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <MovieWatchlist 
                        movieId={movie.id} 
                        movieTitle={movie.title} 
                        iconOnly={false}
                        onAddToWatchlist={handleNextSimilarMovie}
                      />
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              {/* Plot */}
              {movie.plot && (
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-sm sm:text-base font-semibold mb-1.5 sm:mb-2">Overview</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{movie.plot}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousMovie}
                  disabled={!canGoBack}
                  className="flex-1 h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-4"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Previous
                </Button>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleNextSimilarMovie}
                  disabled={loadingNextMovie}
                  className="flex-1 h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-4"
                >
                  {loadingNextMovie ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  Next Similar
                </Button>
              </div>

              {/* Tabs for Organized Content */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-3 sm:mb-4 h-8 sm:h-10">
                  <TabsTrigger value="details" className="text-[10px] sm:text-sm px-2 sm:px-4">Details</TabsTrigger>
                  <TabsTrigger value="cast" className="text-[10px] sm:text-sm px-2 sm:px-4">Cast</TabsTrigger>
                  <TabsTrigger value="more" className="text-[10px] sm:text-sm px-2 sm:px-4">More</TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-2 sm:space-y-3">
                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Genres</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.genres.map((g) => (
                          <Badge key={g} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 sm:h-auto">{g}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* External Links */}
                  <Card className="p-2 sm:p-3">
                    <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Links</h4>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {hasValidImdbId && (
                        <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-3">
                          <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            IMDb
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none h-7 sm:h-9 text-[10px] sm:text-sm px-2 sm:px-3">
                        <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                          <Search className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                          Google
                        </a>
                      </Button>
                    </div>
                  </Card>

                  {/* Awards */}
                  {movie.awards && movie.awards !== "N/A" && (
                    <Card className="p-2 sm:p-3 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                        Awards
                      </h4>
                      <p className="text-[10px] sm:text-sm">{movie.awards}</p>
                    </Card>
                  )}

                  {/* Financial Info */}
                  {(movie.budget || movie.revenue || movie.box_office) && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                        Box Office
                      </h4>
                      <div className="space-y-1 sm:space-y-1.5">
                        {movie.budget && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Budget</span>
                            <span className="text-[10px] sm:text-xs font-semibold">{formatCurrency(movie.budget)}</span>
                          </div>
                        )}
                        {movie.revenue && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Revenue</span>
                            <span className="text-[10px] sm:text-xs font-semibold">{formatCurrency(movie.revenue)}</span>
                          </div>
                        )}
                        {movie.box_office && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Box Office</span>
                            <span className="text-[10px] sm:text-xs font-semibold">{movie.box_office}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Watch Providers */}
                  {watchProviders && (watchProviders.flatrate.length > 0 || watchProviders.rent.length > 0 || watchProviders.buy.length > 0) && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        Where to Watch
                      </h4>
                      <div className="space-y-2">
                        {watchProviders.flatrate.length > 0 && (
                          <div>
                            <p className="text-[9px] sm:text-xs text-muted-foreground mb-1">Streaming</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.flatrate.map((provider: any) => (
                                <div key={provider.provider_id} className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-muted rounded px-1.5 py-0.5">
                                  {provider.provider_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {watchProviders.rent.length > 0 && (
                          <div>
                            <p className="text-[9px] sm:text-xs text-muted-foreground mb-1">Rent</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.rent.map((provider: any) => (
                                <div key={provider.provider_id} className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-muted rounded px-1.5 py-0.5">
                                  {provider.provider_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {watchProviders.buy.length > 0 && (
                          <div>
                            <p className="text-[9px] sm:text-xs text-muted-foreground mb-1">Buy</p>
                            <div className="flex flex-wrap gap-1">
                              {watchProviders.buy.map((provider: any) => (
                                <div key={provider.provider_id} className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-muted rounded px-1.5 py-0.5">
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
                <TabsContent value="cast" className="space-y-2 sm:space-y-3">
                  {/* Director */}
                  {movie.director && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Director</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.director.split(",").map((d) => (
                          <Badge key={d.trim()} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 sm:h-auto">{d.trim()}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Writers */}
                  {movie.writing && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Writers</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.writing.split(",").map((writer) => (
                          <Badge key={writer.trim()} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 sm:h-auto">{writer.trim()}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Cast */}
                  {movie.actors && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Cast</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.actors.split(",").slice(0, 15).map((actor) => (
                          <Badge key={actor.trim()} variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-5 sm:h-auto">{actor.trim()}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Sound */}
                  {movie.sound && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Sound</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.sound.split(",").slice(0, 10).map((person) => (
                          <Badge key={person.trim()} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{person.trim()}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* More Tab */}
                <TabsContent value="more" className="space-y-2 sm:space-y-3">
                  {/* Keywords */}
                  {movie.keywords && movie.keywords.length > 0 && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{keyword}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Production */}
                  {movie.production_companies && Array.isArray(movie.production_companies) && movie.production_companies.length > 0 && (
                    <Card className="p-2 sm:p-3">
                      <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                        Production
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {movie.production_companies.map((company: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{company.name || company}</Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Countries & Languages */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {movie.production_countries && Array.isArray(movie.production_countries) && movie.production_countries.length > 0 && (
                      <Card className="p-2 sm:p-3">
                        <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide">Countries</h4>
                        <div className="flex flex-wrap gap-1">
                          {movie.production_countries.map((country: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{country.name || country}</Badge>
                          ))}
                        </div>
                      </Card>
                    )}

                    {movie.spoken_languages && Array.isArray(movie.spoken_languages) && movie.spoken_languages.length > 0 && (
                      <Card className="p-2 sm:p-3">
                        <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Languages className="h-3 w-3 sm:h-4 sm:w-4" />
                          Languages
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {movie.spoken_languages.map((lang: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{lang.english_name || lang.name || lang}</Badge>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Similar Movies */}
              {similarMovies && similarMovies.length > 0 && (
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Similar Movies</h3>
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-1 sm:-ml-2">
                      {similarMovies.slice(0, 6).map((similar) => {
                        const similarImageProps = getOptimizedImageProps(similar.poster, similar.local_poster_url);
                        return (
                          <CarouselItem key={similar.id} className="basis-1/3 sm:basis-1/4 pl-1 sm:pl-2">
                            <Card 
                              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
                              onClick={() => onNavigateToMovie?.(similar.id)}
                            >
                              {similarImageProps && (
                                <img
                                  {...similarImageProps}
                                  alt={similar.title}
                                  className="w-full aspect-[2/3] object-cover"
                                />
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium line-clamp-2">{similar.title}</p>
                                <p className="text-xs text-muted-foreground">{similar.year}</p>
                              </div>
                            </Card>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
