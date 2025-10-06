import { Star, ExternalLink, Search, Users, Globe, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Movie } from "@/data/types";
import { MovieRating } from "@/components/MovieRating";
import { useState } from "react";
import { getOptimizedImageProps } from "@/lib/imageUtils";
interface MovieCardProps extends Movie {
  onYearClick?: (year: number) => void;
  onGenreClick?: (genre: string) => void;
  onLanguageClick?: (language: string) => void;
  onActorClick?: (actor: string) => void;
  onDirectorClick?: (director: string) => void;
  onWriterClick?: (writer: string) => void;
  onKeywordClick?: (keyword: string) => void;
}
export const MovieCard = ({
  id,
  title,
  rating,
  year,
  genre,
  poster,
  imdbId,
  voteCount,
  originalLanguage,
  plot,
  director,
  actors,
  runtime,
  writing,
  sound,
  keywords,
  onYearClick,
  onGenreClick,
  onLanguageClick,
  onActorClick,
  onDirectorClick,
  onWriterClick,
  onKeywordClick
}: MovieCardProps) => {
  const [open, setOpen] = useState(false);
  const sanitizedTitle = title.trim().slice(0, 200);
  const sanitizedYear = Math.max(1800, Math.min(2100, year));
  const hasValidImdbId = imdbId && imdbId.startsWith('tt');
  const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(sanitizedTitle)}+${sanitizedYear}`;
  const imageProps = getOptimizedImageProps(poster);
  return <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="aspect-[2/3] overflow-hidden relative">
        <img {...imageProps} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Info className="h-4 w-4 mr-1" />
              More Info
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold">{title}</DialogTitle>
              <DialogDescription className="text-base">
                {year} • {runtime || "Runtime N/A"}
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
                        <span className="text-2xl font-bold">{rating}/10</span>
                      </div>
                      {voteCount !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground border-l pl-3">
                          <Users className="h-5 w-5" />
                          <span className="text-lg">{voteCount.toLocaleString()} votes</span>
                        </div>
                      )}
                    </div>
                    {originalLanguage && (
                      <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        {originalLanguage.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Plot */}
                {plot && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Plot Summary
                    </h4>
                    <p className="text-sm leading-relaxed">{plot}</p>
                  </div>
                )}

                {/* Crew Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Director */}
                  {director && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Director</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {director.split(',').map(d => {
                          const name = d.trim();
                          return (
                            <Badge 
                              key={name} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => {
                                onDirectorClick?.(name);
                                setOpen(false);
                              }}
                            >
                              {name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Writers */}
                  {writing && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Writers</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {writing.split(',').map(writer => {
                          const name = writer.trim();
                          return (
                            <Badge 
                              key={name} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => {
                                onWriterClick?.(name);
                                setOpen(false);
                              }}
                            >
                              {name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cast */}
                {actors && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Cast</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {actors.split(',').map(actor => {
                        const name = actor.trim();
                        return (
                          <Badge 
                            key={name} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              onActorClick?.(name);
                              setOpen(false);
                            }}
                          >
                            {name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sound Department */}
                {sound && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Sound Department</h4>
                    <p className="text-sm leading-relaxed">{sound}</p>
                  </div>
                )}

                {/* Genres & Keywords Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Genres */}
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Genres</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {genre.map(g => (
                        <Badge 
                          key={g} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            onGenreClick?.(g);
                            setOpen(false);
                          }}
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  {keywords && keywords.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {keywords.map(keyword => (
                          <Badge 
                            key={keyword} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              onKeywordClick?.(keyword);
                              setOpen(false);
                            }}
                          >
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
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold">{title}</h3>
          <div className="flex items-center gap-1 shrink-0 text-primary">
            <Star className="h-4 w-4 fill-primary" />
            <span className="font-bold">{rating}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => onYearClick?.(year)}>
            {year}
          </Badge>
          {originalLanguage && <Badge variant="outline" className="text-xs flex items-center gap-1 cursor-pointer hover:bg-secondary transition-colors" onClick={() => onLanguageClick?.(originalLanguage)}>
              <Globe className="h-3 w-3" />
              {originalLanguage.toUpperCase()}
            </Badge>}
          {genre.slice(0, 2).map(g => <Badge key={g} variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => onGenreClick?.(g)}>
              {g}
            </Badge>)}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <MovieRating movieId={id} movieTitle={title} />
          <div className="flex gap-2">
            {hasValidImdbId && <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  IMDB
                </a>
              </Button>}
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>;
};