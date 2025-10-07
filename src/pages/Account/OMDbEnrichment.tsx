import { Sparkles, Play, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EnrichmentStats {
  totalMovies: number;
  enrichedMovies: number;
  currentApiUsage: number;
}

interface EnrichmentResult {
  processed: number;
  enriched: number;
  failed: number;
  skipped: number;
  remainingUnenriched: number;
  currentApiUsage: number;
  logs: string[];
  message: string;
}

export const OMDbEnrichment = () => {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [batchSize, setBatchSize] = useState("50");
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total movies with IMDB IDs
      const { count: totalCount } = await supabase
        .from("movies")
        .select("id", { count: 'exact', head: true })
        .like("imdb_id", "tt%");

      // Get enriched movies
      const { count: enrichedCount } = await supabase
        .from("movies")
        .select("id", { count: 'exact', head: true })
        .not("imdb_rating", "is", null);

      // Get today's API usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from("omdb_api_usage")
        .select("requests_count")
        .eq("date", today)
        .maybeSingle();

      setStats({
        totalMovies: totalCount || 0,
        enrichedMovies: enrichedCount || 0,
        currentApiUsage: usageData?.requests_count || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-with-omdb', {
        body: {
          batchSize: parseInt(batchSize),
          forceRefresh
        }
      });

      if (error) throw error;

      setResult(data);
      await fetchStats(); // Refresh stats

      toast({
        title: "Enrichment complete",
        description: data.message
      });
    } catch (error: any) {
      console.error("Enrichment error:", error);
      toast({
        title: "Enrichment failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const enrichmentPercentage = stats
    ? (stats.enrichedMovies / stats.totalMovies) * 100
    : 0;

  const apiUsagePercentage = stats
    ? (stats.currentApiUsage / 1000) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            OMDb Enrichment
          </CardTitle>
          <CardDescription>
            Add IMDB ratings, Metascores, box office data, and awards information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Movies</div>
              <div className="text-2xl font-bold">{stats?.totalMovies || 0}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Enriched</div>
              <div className="text-2xl font-bold">{stats?.enrichedMovies || 0}</div>
              <Progress value={enrichmentPercentage} className="mt-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {enrichmentPercentage.toFixed(1)}% complete
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">API Usage Today</div>
              <div className="text-2xl font-bold">{stats?.currentApiUsage || 0}/1,000</div>
              <Progress 
                value={apiUsagePercentage} 
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {(1000 - (stats?.currentApiUsage || 0))} requests remaining
              </div>
            </div>
          </div>

          {/* API Usage Warning */}
          {stats && stats.currentApiUsage > 800 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Approaching daily API limit. Consider upgrading to OMDb premium ($5/month) for unlimited requests.
              </AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger id="batch-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 movies</SelectItem>
                  <SelectItem value="50">50 movies (recommended)</SelectItem>
                  <SelectItem value="100">100 movies</SelectItem>
                  <SelectItem value="250">250 movies</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="force-refresh">Force Refresh</Label>
                <div className="text-xs text-muted-foreground">
                  Re-fetch movies last updated over 30 days ago
                </div>
              </div>
              <Switch
                id="force-refresh"
                checked={forceRefresh}
                onCheckedChange={setForceRefresh}
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleEnrich}
            disabled={isEnriching || (stats?.currentApiUsage || 0) >= 950}
            size="lg"
            className="w-full"
          >
            {isEnriching ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Enrich Movies
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Enrichment Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                    <div className="text-lg font-bold">{result.processed}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Enriched</div>
                    <div className="text-lg font-bold text-green-600">{result.enriched}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                    <div className="text-lg font-bold text-red-600">{result.failed}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                    <div className="text-lg font-bold">{result.remainingUnenriched}</div>
                  </div>
                </div>

                {result.logs && result.logs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Enrichment Log</Label>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="space-y-1">
                        {result.logs.map((log, idx) => (
                          <div key={idx} className="text-xs font-mono">
                            {log}
                          </div>
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
  );
};