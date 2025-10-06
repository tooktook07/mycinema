import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink, Search, Users, Globe, Info, DollarSign, Calendar, Film, Languages } from "lucide-react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { MovieRating } from "@/components/MovieRating";

export const MovieDetailModal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    navigate(-1);
  };

  const imageProps = movie ? getOptimizedImageProps(movie.poster) : null;
  const hasValidImdbId = movie?.imdb_id && movie.imdb_id.startsWith('tt');
  const imdbUrl = hasValidImdbId ? `https://www.imdb.com/title/${movie.imdb_id}/` : '';
  const googleSearchUrl = movie ? `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}` : '';

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

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
            <div className="relative h-[40vh] overflow-hidden bg-gradient-to-b from-background/50 to-background">
              {imageProps && (
                <img
                  {...imageProps}
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
              
              <div className="relative h-full flex items-end p-8">
                <div className="flex gap-6 items-end">
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
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="text-sm">
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
                        <Badge variant="secondary" className="text-sm">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <ScrollArea className="max-h-[50vh] p-8 pt-6">
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {hasValidImdbId && (
                    <Button variant="default" asChild>
                      <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on IMDB
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                      <Search className="h-4 w-4 mr-2" />
                      Google Search
                    </a>
                  </Button>
                  <MovieRating movieId={movie.id} movieTitle={movie.title} />
                </div>

                {/* Plot */}
                {movie.plot && (
                  <div className="rounded-lg border p-5">
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Plot Summary
                    </h4>
                    <p className="text-sm leading-relaxed">{movie.plot}</p>
                  </div>
                )}

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
                          <Badge key={d.trim()} variant="secondary">
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
                          <Badge key={writer.trim()} variant="secondary">
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
                      {movie.actors.split(',').map(actor => (
                        <Badge key={actor.trim()} variant="secondary">
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
                    <p className="text-sm leading-relaxed">{movie.sound}</p>
                  </div>
                )}

                {/* Genres & Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Genres</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.genres.map(g => (
                          <Badge key={g} variant="secondary">
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
                          <Badge key={keyword} variant="outline" className="text-xs">
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
                      {movie.production_companies.map((company: any, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {company.name || company}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Production Countries & Languages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.production_countries && Array.isArray(movie.production_countries) && movie.production_countries.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Production Countries</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.production_countries.map((country: any, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {country.name || country}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {movie.spoken_languages && Array.isArray(movie.spoken_languages) && movie.spoken_languages.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Spoken Languages
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.spoken_languages.map((lang: any, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {lang.english_name || lang.name || lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Watch Providers */}
                {movie.watch_providers && typeof movie.watch_providers === 'object' && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Where to Watch</h4>
                    <p className="text-sm text-muted-foreground">
                      {JSON.stringify(movie.watch_providers).length > 50 
                        ? 'Available on various streaming platforms'
                        : 'Check IMDB for availability'}
                    </p>
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
