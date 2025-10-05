import { Download, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SyncFilterPanel } from "@/components/SyncFilterPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SyncResult {
  totalFound: number;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
  failed: number;
  logs: string[];
}

const Account = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  
  // Filter states with defaults
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Released"]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([6.9, 9.5]);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2025]);
  const [minVoteCount, setMinVoteCount] = useState(100);
  const [minPopularity, setMinPopularity] = useState(0);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleExcludedGenreToggle = (genre: string) => {
    setExcludedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSyncMovies = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
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
          minVoteCount,
          minPopularity,
          syncMode: true, // Enable sync mode for updates and deletions
        }
      });

      if (error) throw error;

      setSyncResult(data);
      
      toast({
        title: "Sync Complete!",
        description: `Imported ${data.imported} new, updated ${data.updated}, removed ${data.removed} movies.`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync movies",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Account Settings</h1>
        </div>

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
              <Button
                onClick={handleSyncMovies}
                disabled={isSyncing}
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {isSyncing ? "Syncing..." : "Sync Movies"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGenres([]);
                  setExcludedGenres([]);
                  setSelectedStatuses(["Released"]);
                  setRatingRange([6.9, 9.5]);
                  setYearRange([2025, 2025]);
                  setMinVoteCount(100);
                  setMinPopularity(0);
                }}
                size="lg"
              >
                Reset to Defaults
              </Button>
            </div>

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
      </div>
    </div>
  );
};

export default Account;
