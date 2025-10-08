import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Image, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const PosterStorage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{
    total: number;
    stored: number;
    remaining: number;
  } | null>(null);

  const loadStats = async () => {
    const { count: total } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    const { count: stored } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('local_poster_url', 'is', null);

    setStats({
      total: total || 0,
      stored: stored || 0,
      remaining: (total || 0) - (stored || 0),
    });
  };

  const handleStorePoster = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      await loadStats();
      
      const batchSize = 100;
      let offset = 0;
      let totalProcessed = 0;
      let syncHistoryId: string | null = null;
      
      while (true) {
        const { data, error } = await supabase.functions.invoke('store-posters', {
          body: { 
            limit: batchSize, 
            offset,
            syncHistoryId 
          }
        });

        if (error) throw error;

        // Store sync history ID from first batch
        if (!syncHistoryId && data.syncHistoryId) {
          syncHistoryId = data.syncHistoryId;
        }

        if (data.processed === 0) {
          break;
        }

        totalProcessed += data.processed;
        offset += batchSize;
        
        const progressPercent = stats?.remaining 
          ? Math.min((totalProcessed / stats.remaining) * 100, 100)
          : 0;
        
        setProgress(progressPercent);
        
        toast.info(`Processed ${totalProcessed} posters...`);
        
        if (data.processed < batchSize) {
          break;
        }
      }

      await loadStats();
      toast.success(`✓ Successfully stored ${totalProcessed} posters!`);
    } catch (error: any) {
      console.error('Error storing posters:', error);
      toast.error(error.message || 'Failed to store posters');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Local Poster Storage
          </CardTitle>
          <CardDescription>
            Download and store movie posters locally for faster loading and better performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Movies</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stored Locally</p>
                <p className="text-2xl font-bold text-green-500">{stats.stored}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-orange-500">{stats.remaining}</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Processing posters... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={loadStats}
              variant="outline"
              disabled={isProcessing}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Check Stats
            </Button>
            
            <Button
              onClick={handleStorePoster}
              disabled={isProcessing || (stats?.remaining === 0)}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isProcessing ? 'Processing...' : 'Download & Store Posters'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Posters are stored in your Lovable Cloud storage</p>
            <p>• This process downloads posters from TMDB and stores them locally</p>
            <p>• Locally stored posters load faster and don't rely on external services</p>
            <p>• Processing happens in batches of 100 movies</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
