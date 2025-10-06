import { Star, Heart, ThumbsUp, X, Info, ExternalLink, Search, Users, Globe, SkipForward, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { RecommendationMovie } from "@/lib/recommendationEngine";

interface MovieWizardCardProps {
  movie: RecommendationMovie;
  onRate: (rating: number) => void;
  onSkip: () => void;
  totalRated: number;
  isProcessing: boolean;
  processingAction: 'skip' | 'not-interested' | 'like' | 'love' | null;
}

export const MovieWizardCard = ({ movie, onRate, onSkip, totalRated, isProcessing, processingAction }: MovieWizardCardProps) => {
  const [open, setOpen] = useState(false);
  const imageProps = getOptimizedImageProps(movie.poster);
  const hasValidImdbId = movie.imdbId && movie.imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${movie.imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(movie.title)}+${movie.year}`;

  return (
    <Card className="w-full max-w-6xl mx-auto overflow-hidden relative h-[calc(100vh-200px)]">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading next movie...</p>
          </div>
        </div>
      )}
      
      {/* Grid Layout: Poster on left, Info on right */}
      <div className="grid grid-cols-1 md:grid-cols-5 h-full">
        {/* Poster Column */}
        <div className="relative md:col-span-2 h-[50vh] md:h-full">
          {/* Progress Indicator */}
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="secondary" className="text-sm font-semibold">
              Movie #{totalRated + 1}
            </Badge>
          </div>

          {/* More Info Button */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant="secondary" 
                className="absolute top-4 right-4 z-10"
              >
                <Info className="h-4 w-4 mr-1" />
                More Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold">{movie.title}</DialogTitle>
                <DialogDescription className="text-base">
                  {movie.year} • {movie.runtime || "Runtime N/A"}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Rating & Stats Card */}
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-6 w-6 fill-primary text-primary" />
                          <span className="text-2xl font-bold">{movie.rating}/10</span>
                        </div>
                        {movie.voteCount !== undefined && (
                          <div className="flex items-center gap-2 text-muted-foreground border-l pl-3">
                            <Users className="h-5 w-5" />
                            <span className="text-lg">{movie.voteCount.toLocaleString()} votes</span>
                          </div>
                        )}
                      </div>
                      {movie.originalLanguage && (
                        <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                          <Globe className="h-4 w-4" />
                          {movie.originalLanguage.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Plot */}
                  {movie.plot && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Plot Summary
                      </h4>
                      <p className="text-sm leading-relaxed">{movie.plot}</p>
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

                  {/* Genres & Keywords Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Genres</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {movie.genre.map(g => (
                          <Badge key={g} variant="secondary">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </div>

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

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    {hasValidImdbId && (
                      <Button variant="default" size="lg" className="flex-1" asChild>
                        <a href={imdbUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on IMDB
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="lg" className="flex-1" asChild>
                      <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow">
                        <Search className="h-4 w-4 mr-2" />
                        Google Search
                      </a>
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Movie Poster */}
          <img 
            {...imageProps}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Column */}
        <div className="md:col-span-3 flex flex-col h-full">
          <ScrollArea className="flex-1 px-6 py-6">
            {/* Movie Title & Meta */}
            <div className="mb-4">
              <h2 className="text-2xl md:text-3xl font-bold line-clamp-2">{movie.title}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary">{movie.year}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-semibold">{movie.rating}/10</span>
                </div>
                {movie.originalLanguage && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {movie.originalLanguage.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.genre.map(g => (
                <Badge key={g} variant="secondary">
                  {g}
                </Badge>
              ))}
            </div>

            {/* Plot Preview */}
            {movie.plot && (
              <p className="text-sm text-muted-foreground line-clamp-4 md:line-clamp-6">
                {movie.plot}
              </p>
            )}
          </ScrollArea>

          {/* Rating Buttons - Fixed at Bottom */}
          <div className="border-t p-4 bg-background">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  onClick={() => onRate(1)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'not-interested' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Not Interested</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => onRate(5)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'like' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Like</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex flex-col gap-1.5 h-auto py-3 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => onRate(10)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === 'love' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                  <span className="text-[10px] md:text-xs">Love</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={onSkip}
                disabled={isProcessing}
              >
                {isProcessing && processingAction === 'skip' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Next Movie...
                  </>
                ) : (
                  <>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pass
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
