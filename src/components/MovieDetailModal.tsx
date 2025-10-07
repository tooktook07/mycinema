import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink, Search, Users, Globe, Info, DollarSign, Calendar, Film, Languages, X } from "lucide-react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { MovieRating } from "@/components/MovieRating";

export const MovieDetailModal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if this is modal overlay mode or full-page mode
  const isModalMode = !!location.state?.backgroundLocation;

  const { data: movie, isLoading, error } = useQuery({
    queryKey: ['movie', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Movie not found');
      return data;
    },
    enabled: !!id,
  });

  const handleClose = () => {
    if (isModalMode) {
      // Modal mode: navigate back to background location
      const backgroundLocation = location.state.backgroundLocation;
      navigate(backgroundLocation.pathname + backgroundLocation.search, { replace: true });
    } else {
      // Full-page mode: navigate to /movies
      navigate('/movies', { replace: true });
    }
  };

  const imageProps = movie ? getOptimizedImageProps(movie.poster) : null;
  const hasValidImdbId = movie?.imdb_id && movie.imdb_id.startsWith('tt');
  const imdbUrl = hasValidImdbId ? `https://www.imdb.com/title/${movie.imdb_id}/` : '';
  const googleSearchUrl = movie ? `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}` : '';

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  // Navigation handlers for internal linking
  const handleFieldClick = (filterType: 'year' | 'genre' | 'language' | 'search', value: string | number) => {
    const params = new URLSearchParams();
    
    if (filterType === 'year' && typeof value === 'number') {
      params.set('year', `${value}-${value}`);
    } else if (filterType === 'genre' && typeof value === 'string') {
      params.set('genres', value);
    } else if (filterType === 'language' && typeof value === 'string') {
      params.set('languages', value);
    } else if (filterType === 'search' && typeof value === 'string') {
      params.set('search', value);
    }
    
    // Navigate to movies page with filter params - modal will close automatically
    navigate(`/movies?${params.toString()}`);
  };

  // Parse watch providers
  const parseWatchProviders = (providers: any) => {
    if (!providers) return null;
    
    // Check if providers has a 'results' key (TMDB structure)
    const regions = providers.results || providers;
    
    // Try to get US region first, or first available region
    const region = regions['US'] || regions['GB'] || Object.values(regions)[0];
    if (!region || typeof region !== 'object') return null;
    
    return {
      flatrate: (region as any).flatrate || [],
      rent: (region as any).rent || [],
      buy: (region as any).buy || []
    };
  };

  const watchProviders = movie ? parseWatchProviders(movie.watch_providers) : null;

  // Shared content rendering
  const renderContent = () => (
    <>
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
                    <img
                      {...imageProps}
                      alt={movie.title}
                      className="w-full h-auto"
                    />
                  </div>
                )}
                
                {/* Title & Quick Info */}
                <div className="flex-1 space-y-3">
                  <DialogHeader>
                    <DialogTitle className="text-4xl font-bold">{movie.title}</DialogTitle>
                    {movie.tagline && (
                      <p className="text-lg text-muted-foreground italic">"{movie.tagline}"</p>
                    )}
                  </DialogHeader>

                  {/* Plot - Right after tagline */}
                  {movie.plot && (
                    <div className="p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50">
                      <h4 className="text-sm font-semibold mb-2">Plot</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{movie.plot}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className="text-sm cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handleFieldClick('year', movie.year)}
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
                        onClick={() => handleFieldClick('language', movie.original_language)}
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
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-6 w-6 fill-primary text-primary" />
                        <span className="text-2xl font-bold">{movie.rating}/10</span>
                      </div>
                      {movie.vote_count && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-5 w-5" />
                          <span>{movie.vote_count.toLocaleString()} votes</span>
                        </div>
                      )}
                      {movie.popularity && (
                        <Badge variant="outline">
                          Popularity: {Math.round(movie.popularity)}
                        </Badge>
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
                      <MovieRating movieId={movie.id} movieTitle={movie.title} iconOnly={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <ScrollArea className="max-h-[400px] p-8 pt-6">
            <div className="space-y-6">
              {/* Financial Info */}
              {(movie.budget || movie.revenue) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}

              {/* Crew Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {movie.director && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Director</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.director.split(',').map(d => (
                        <Badge 
                          key={d.trim()} 
                          variant="secondary"
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleFieldClick('search', d.trim())}
                        >
                          {d.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {movie.writing && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Writers</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.writing.split(',').map(writer => (
                        <Badge 
                          key={writer.trim()} 
                          variant="secondary"
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleFieldClick('search', writer.trim())}
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
                    {movie.actors.split(',').slice(0, 15).map(actor => (
                      <Badge 
                        key={actor.trim()} 
                        variant="secondary"
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleFieldClick('search', actor.trim())}
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
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Sound Department</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.sound.split(',').slice(0, 10).map(person => (
                      <Badge 
                        key={person.trim()} 
                        variant="outline"
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleFieldClick('search', person.trim())}
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
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Genres</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.genres.map(g => (
                        <Badge 
                          key={g} 
                          variant="secondary"
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleFieldClick('genre', g)}
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {movie.keywords && movie.keywords.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.keywords.map(keyword => (
                        <Badge 
                          key={keyword} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleFieldClick('search', keyword)}
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Production Companies */}
              {movie.production_companies && Array.isArray(movie.production_companies) && movie.production_companies.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Production Companies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.production_companies.map((company: any) => (
                      <Badge 
                        key={company.id || company.name} 
                        variant="secondary"
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleFieldClick('search', company.name)}
                      >
                        {company.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Countries */}
              {movie.production_countries && Array.isArray(movie.production_countries) && movie.production_countries.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Production Countries
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.production_countries.map((country: any) => (
                      <Badge key={country.iso_3166_1 || country.name} variant="outline">
                        {country.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Spoken Languages */}
              {movie.spoken_languages && Array.isArray(movie.spoken_languages) && movie.spoken_languages.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Spoken Languages
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.spoken_languages.map((lang: any) => (
                      <Badge 
                        key={lang.iso_639_1 || lang.name} 
                        variant="outline"
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleFieldClick('language', lang.iso_639_1)}
                      >
                        {lang.english_name || lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Watch Providers */}
              {watchProviders && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Where to Watch
                  </h4>
                  <div className="space-y-4">
                    {/* Stream */}
                    {watchProviders.flatrate && watchProviders.flatrate.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Stream</p>
                        <div className="flex flex-wrap gap-2">
                          {watchProviders.flatrate.map((provider: any) => (
                            <div key={provider.provider_id} className="flex flex-col items-center gap-1">
                              <img 
                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                alt={provider.provider_name}
                                className="w-12 h-12 rounded-lg"
                                loading="lazy"
                              />
                              <span className="text-xs text-center max-w-[60px] truncate">{provider.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rent */}
                    {watchProviders.rent && watchProviders.rent.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Rent</p>
                        <div className="flex flex-wrap gap-2">
                          {watchProviders.rent.map((provider: any) => (
                            <div key={provider.provider_id} className="flex flex-col items-center gap-1">
                              <img 
                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                alt={provider.provider_name}
                                className="w-12 h-12 rounded-lg"
                                loading="lazy"
                              />
                              <span className="text-xs text-center max-w-[60px] truncate">{provider.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Buy */}
                    {watchProviders.buy && watchProviders.buy.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Buy</p>
                        <div className="flex flex-wrap gap-2">
                          {watchProviders.buy.map((provider: any) => (
                            <div key={provider.provider_id} className="flex flex-col items-center gap-1">
                              <img 
                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                alt={provider.provider_name}
                                className="w-12 h-12 rounded-lg"
                                loading="lazy"
                              />
                              <span className="text-xs text-center max-w-[60px] truncate">{provider.provider_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No providers found */}
                    {(!watchProviders.flatrate || watchProviders.flatrate.length === 0) &&
                     (!watchProviders.rent || watchProviders.rent.length === 0) &&
                     (!watchProviders.buy || watchProviders.buy.length === 0) && (
                      <p className="text-sm text-muted-foreground">No streaming information available.</p>
                    )}
                  </div>
                  {hasValidImdbId && (
                    <Button variant="outline" size="sm" asChild className="mt-4">
                      <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                        Check IMDB for Availability
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      ) : null}
    </>
  );

  // Render as modal overlay or full page
  if (isModalMode) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          {renderContent()}
        </DialogContent>
      </Dialog>
    );
  }

  // Full-page mode
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl py-8">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          className="mb-4"
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
        <div className="rounded-lg border overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
