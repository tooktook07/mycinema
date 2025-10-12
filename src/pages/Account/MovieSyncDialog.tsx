import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Movie } from "@/data/types";
import { RefreshCw, Database, Award, Image } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MovieSyncDialogProps {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MovieSyncDialog = ({ movie, open, onOpenChange, onSuccess }: MovieSyncDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncOptions, setSyncOptions] = useState({
    tmdb: false,
    omdb: false,
    poster: false,
  });
  const [results, setResults] = useState<any>(null);

  const handleSync = async () => {
    if (!movie) return;

    const selectedOptions = Object.entries(syncOptions).filter(([_, enabled]) => enabled);
    if (selectedOptions.length === 0) {
      toast({
        title: "No options selected",
        description: "Please select at least one sync option",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(10);
    setResults(null);

    try {
      setProgress(30);
      const { data, error } = await supabase.functions.invoke('sync-single-movie', {
        body: { movieId: movie.id, syncOptions }
      });

      setProgress(90);

      if (error) throw error;

      setProgress(100);
      setResults(data.results);

      const successCount = Object.values(data.results).filter((r: any) => r.success).length;
      const totalCount = Object.keys(syncOptions).filter(k => syncOptions[k as keyof typeof syncOptions]).length;

      toast({
        title: successCount === totalCount ? "Sync Complete" : "Sync Partially Complete",
        description: `${successCount}/${totalCount} operations completed successfully`,
      });

      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync movie data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const toggleAll = () => {
    const allSelected = syncOptions.tmdb && syncOptions.omdb && syncOptions.poster;
    setSyncOptions({
      tmdb: !allSelected,
      omdb: !allSelected,
      poster: !allSelected,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Movie Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which data sources to re-sync for "{movie?.title}" ({movie?.year})
          </p>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">Syncing...</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={syncOptions.tmdb && syncOptions.omdb && syncOptions.poster}
                onCheckedChange={toggleAll}
                disabled={loading}
              />
              <Label htmlFor="selectAll" className="font-semibold cursor-pointer">
                Select All
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tmdb"
                checked={syncOptions.tmdb}
                onCheckedChange={(checked) => setSyncOptions({ ...syncOptions, tmdb: !!checked })}
                disabled={loading}
              />
              <Database className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="tmdb" className="cursor-pointer">
                Fetch TMDB data (title, plot, ratings, genres)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="omdb"
                checked={syncOptions.omdb}
                onCheckedChange={(checked) => setSyncOptions({ ...syncOptions, omdb: !!checked })}
                disabled={loading}
              />
              <Award className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="omdb" className="cursor-pointer">
                Enrich with OMDb data (IMDb rating, awards, box office)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="poster"
                checked={syncOptions.poster}
                onCheckedChange={(checked) => setSyncOptions({ ...syncOptions, poster: !!checked })}
                disabled={loading}
              />
              <Image className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="poster" className="cursor-pointer">
                Download/update poster
              </Label>
            </div>
          </div>

          {results && (
            <div className="space-y-2 p-3 bg-muted rounded-md text-sm">
              <p className="font-semibold">Sync Results:</p>
              {Object.entries(results).map(([key, result]: [string, any]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}:</span>
                  <span className={result.success ? "text-green-600" : "text-destructive"}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>
          <Button onClick={handleSync} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Start Sync'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
