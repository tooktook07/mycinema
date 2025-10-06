import { Download, CheckCircle, XCircle, AlertCircle, StopCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SyncFilterPanel } from "@/components/SyncFilterPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SyncResult {
  totalFound: number;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
  failed: number;
  logs: string[];
  error?: string;
}

interface SyncMoviesProps {
  initialFilters?: any;
  autoStart?: boolean;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  excludedGenres: string[];
  setExcludedGenres: (genres: string[]) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (statuses: string[]) => void;
  selectedLanguages: string[];
  setSelectedLanguages: (languages: string[]) => void;
  ratingRange: [number, number];
  setRatingRange: (range: [number, number]) => void;
  yearRange: [number, number];
  setYearRange: (range: [number, number]) => void;
  minVoteCount: number;
  setMinVoteCount: (count: number) => void;
  minPopularity: number;
  setMinPopularity: (popularity: number) => void;
}

export const SyncMovies = ({
  initialFilters,
  autoStart,
  selectedGenres,
  setSelectedGenres,
  excludedGenres,
  setExcludedGenres,
  selectedStatuses,
  setSelectedStatuses,
  selectedLanguages,
  setSelectedLanguages,
  ratingRange,
  setRatingRange,
  yearRange,
  setYearRange,
  minVoteCount,
  setMinVoteCount,
  minPopularity,
  setMinPopularity,
}: SyncMoviesProps) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);

  const handleGenreToggle = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(newGenres);
  };

  const handleExcludedGenreToggle = (genre: string) => {
    const newGenres = excludedGenres.includes(genre)
      ? excludedGenres.filter(g => g !== genre)
      : [...excludedGenres, genre];
    setExcludedGenres(newGenres);
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
  };

  const handleLanguageToggle = (language: string) => {
    const newLanguages = selectedLanguages.includes(language)
      ? selectedLanguages.filter(l => l !== language)
      : [...selectedLanguages, language];
    setSelectedLanguages(newLanguages);
  };

  // Auto-start sync if requested
  useEffect(() => {
    if (autoStart && !isSyncing) {
      handleSyncMovies();
    }
  }, [autoStart]);

  // Apply initial filters if provided
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.genres) setSelectedGenres(initialFilters.genres);
      if (initialFilters.excludedGenres) setExcludedGenres(initialFilters.excludedGenres);
      if (initialFilters.statuses) setSelectedStatuses(initialFilters.statuses);
      if (initialFilters.languages) setSelectedLanguages(initialFilters.languages);
      if (initialFilters.minRating !== undefined && initialFilters.maxRating !== undefined) {
        setRatingRange([initialFilters.minRating, initialFilters.maxRating]);
      }
      if (initialFilters.yearRange) setYearRange(initialFilters.yearRange);
      if (initialFilters.minVoteCount !== undefined) setMinVoteCount(initialFilters.minVoteCount);
      if (initialFilters.minPopularity !== undefined) setMinPopularity(initialFilters.minPopularity);
    }
  }, [initialFilters]);

  const handleStopSync = async () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    if (currentSyncId) {
      try {
        await supabase.functions.invoke('cancel-sync', {
          body: { syncId: currentSyncId }
        });
        
        toast({
          title: "Sync Stopped",
          description: "The sync operation has been cancelled.",
        });
      } catch (error) {
        console.error('Error stopping sync:', error);
      }
    }
    
    setIsSyncing(false);
    setCurrentSyncId(null);
  };

  const handleSyncMovies = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      toast({
        title: "Syncing movies...",
        description: "Syncing movies from TMDB with your filters. This may take a moment.",
      });

      const { data, error } = await supabase.functions.invoke('import-tmdb-movies', {
        body: {
          minRating: ratingRange[0],
          maxRating: ratingRange[1],
          yearRange,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          excludedGenres: excludedGenres.length > 0 ? excludedGenres : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
          minVoteCount,
          minPopularity,
          syncMode: true,
        }
      });

      if (error) throw error;

      // Track sync ID for cancellation
      if (data.syncId) {
        setCurrentSyncId(data.syncId);
      }

      setSyncResult(data);
      
      if (data.error) {
        toast({
          title: "Sync Failed",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Complete!",
          description: `Imported ${data.imported} new, updated ${data.updated}, removed ${data.removed} movies.`,
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to sync movies";
      setSyncResult({
        totalFound: 0,
        imported: 0,
        updated: 0,
        removed: 0,
        skipped: 0,
        failed: 0,
        logs: [],
        error: errorMessage
      });
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setAbortController(null);
      setCurrentSyncId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Movies from TMDB</CardTitle>
        <CardDescription>Configure filters to sync movie data - imports new movies, updates existing ones, and removes movies that don't match your filters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SyncFilterPanel
          selectedGenres={selectedGenres}
          onGenreToggle={handleGenreToggle}
          excludedGenres={excludedGenres}
          onExcludedGenreToggle={handleExcludedGenreToggle}
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
          selectedLanguages={selectedLanguages}
          onLanguageToggle={handleLanguageToggle}
          ratingRange={ratingRange}
          onRatingRangeChange={setRatingRange}
          yearRange={yearRange}
          onYearRangeChange={setYearRange}
          minVoteCount={minVoteCount}
          onMinVoteCountChange={setMinVoteCount}
          minPopularity={minPopularity}
          onMinPopularityChange={setMinPopularity}
        />

        <div className="flex gap-3 pt-4 border-t border-border">
          {!isSyncing ? (
            <>
              <Button
                onClick={handleSyncMovies}
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Sync Movies
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGenres([]);
                  setExcludedGenres([]);
                  setSelectedStatuses(["Released"]);
                  setSelectedLanguages([]);
                  setRatingRange([6.9, 9.5]);
                  setYearRange([2025, 2025]);
                  setMinVoteCount(1000);
                  setMinPopularity(0);
                }}
                size="lg"
              >
                Reset to Defaults
              </Button>
            </>
          ) : (
            <Button
              onClick={handleStopSync}
              variant="destructive"
              size="lg"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Sync
            </Button>
          )}
        </div>

        {syncResult?.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Sync Failed</div>
              {syncResult.error}
            </AlertDescription>
          </Alert>
        )}

        {syncResult && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Sync Results
                <Badge variant="secondary">{syncResult.totalFound} found</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Imported</p>
                    <p className="text-2xl font-bold text-green-500">{syncResult.imported}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Updated</p>
                    <p className="text-2xl font-bold text-blue-500">{syncResult.updated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <XCircle className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Removed</p>
                    <p className="text-2xl font-bold text-purple-500">{syncResult.removed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Skipped</p>
                    <p className="text-2xl font-bold text-yellow-500">{syncResult.skipped}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-500">{syncResult.failed}</p>
                  </div>
                </div>
              </div>

              {syncResult.logs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Sync Log</h4>
                  <ScrollArea className="h-48 rounded-lg border border-border bg-background/50 p-3">
                    <div className="space-y-1">
                      {syncResult.logs.map((log, idx) => (
                        <p key={idx} className="text-xs font-mono text-muted-foreground">
                          {log}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
