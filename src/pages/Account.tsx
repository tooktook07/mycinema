import { Download, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ImportFilterPanel } from "@/components/ImportFilterPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  totalFound: number;
  imported: number;
  skipped: number;
  failed: number;
  logs: string[];
}

const Account = () => {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(6.9);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2025]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleImportMovies = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      toast({
        title: "Importing movies...",
        description: "Fetching movies from TMDB with your filters. This may take a moment.",
      });

      const { data, error } = await supabase.functions.invoke('import-tmdb-movies', {
        body: {
          minRating,
          yearRange,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        }
      });

      if (error) throw error;

      setImportResult(data);
      
      toast({
        title: "Import Complete!",
        description: `Imported ${data.imported} new movies, skipped ${data.skipped} existing ones.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import movies",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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
            <CardTitle>Import Movies from TMDB</CardTitle>
            <CardDescription>Configure filters and import movie data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImportFilterPanel
              selectedGenres={selectedGenres}
              onGenreToggle={handleGenreToggle}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              yearRange={yearRange}
              onYearRangeChange={setYearRange}
            />

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={handleImportMovies}
                disabled={isImporting}
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import Movies"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGenres([]);
                  setMinRating(6.9);
                  setYearRange([2025, 2025]);
                }}
                size="lg"
              >
                Reset Filters
              </Button>
            </div>

            {importResult && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Import Results
                    <Badge variant="secondary">{importResult.totalFound} found</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Imported</p>
                        <p className="text-2xl font-bold text-green-500">{importResult.imported}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Skipped</p>
                        <p className="text-2xl font-bold text-yellow-500">{importResult.skipped}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-500">{importResult.failed}</p>
                      </div>
                    </div>
                  </div>

                  {importResult.logs.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Import Log</h4>
                      <ScrollArea className="h-48 rounded-lg border border-border bg-background/50 p-3">
                        <div className="space-y-1">
                          {importResult.logs.map((log, idx) => (
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
