import { useState } from "react";
import { Search, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoteTierConfig } from "@/data/types";

interface MovieImportCheckerProps {
  currentFilters: {
    minRating: number;
    maxRating: number;
    voteTiers: VoteTierConfig;
    yearRange: [number, number];
    genres: string[];
    excludedGenres: string[];
    languages: string[];
    statuses: string[];
    minPopularity: number;
  };
}

export const MovieImportChecker = ({ currentFilters }: MovieImportCheckerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a movie title or TMDB ID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-movie-import', {
        body: {
          searchQuery: searchQuery.trim(),
          filters: currentFilters,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
    } catch (error: any) {
      console.error('Error checking movie:', error);
      toast.error(error.message || "Failed to check movie");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      imported: { label: "✅ Imported", variant: "default" },
      skipped: { label: "⏭️ Skipped", variant: "secondary" },
      not_processed: { label: "❌ Not Processed", variant: "destructive" },
      removed: { label: "🗑️ Removed", variant: "outline" },
    };

    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const FilterResult = ({ label, result }: { label: string; result: any }) => {
    const Icon = result.passes ? CheckCircle2 : XCircle;
    const colorClass = result.passes ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
        <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-mono">{JSON.stringify(result.current)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Required: <span className="font-mono">{JSON.stringify(result.required || result.excluded)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Movie Import Checker</CardTitle>
          <CardDescription>
            Search for a movie by title or TMDB ID to understand why it wasn't imported
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter movie title or TMDB ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            />
            <Button onClick={handleCheck} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Checking..." : "Check"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{result.movie.title}</CardTitle>
                <CardDescription>
                  TMDB ID: {result.movie.tmdb_id} • Year: {result.movie.year}
                </CardDescription>
              </div>
              {getStatusBadge(result.import_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.movie.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w200${result.movie.poster_path}`}
                alt={result.movie.title}
                className="w-32 h-auto rounded-lg"
              />
            )}

            {result.import_status === 'imported' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This movie has been successfully imported into your database.
                </AlertDescription>
              </Alert>
            )}

            {result.processed_record && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Previously Processed</div>
                  <div className="text-sm">
                    Status: {result.processed_record.import_status}
                    {result.processed_record.skip_reason && (
                      <div className="mt-1">Reason: {result.processed_record.skip_reason}</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">Filter Analysis</h3>
              <div className="grid gap-3">
                <FilterResult label="Rating" result={result.filter_results.rating} />
                <FilterResult label="Vote Count" result={result.filter_results.vote_count} />
                <FilterResult label="Year" result={result.filter_results.year} />
                <FilterResult label="Genres" result={result.filter_results.genres} />
                {result.filter_results.excluded_genres.excluded?.length > 0 && (
                  <FilterResult label="Excluded Genres" result={result.filter_results.excluded_genres} />
                )}
                <FilterResult label="Language" result={result.filter_results.language} />
                <FilterResult label="Status" result={result.filter_results.status} />
                <FilterResult label="Popularity" result={result.filter_results.popularity} />
              </div>
            </div>

            {!result.overall_passes && result.blocking_filters.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Movie blocked by filters:</div>
                  <ul className="list-disc list-inside text-sm">
                    {result.blocking_filters.map((filter: string) => (
                      <li key={filter}>{filter.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.overall_passes && result.import_status === 'not_processed' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This movie passes all current filters and should be imported in the next sync.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.themoviedb.org/movie/${result.movie.tmdb_id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on TMDB
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
