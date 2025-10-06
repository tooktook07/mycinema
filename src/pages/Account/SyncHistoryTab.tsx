import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, AlertCircle, CheckCircle2, XCircle, AlertTriangle, RotateCw, Trash2, StopCircle } from "lucide-react";
import { format } from "date-fns";
import { useDevMode } from "@/contexts/DevModeContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SyncHistoryRecord {
  id: string;
  created_at: string;
  completed_at: string | null;
  sync_mode: boolean;
  filters: any;
  total_found: number;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
  failed: number;
  logs: string[];
  status: string;
  error_message: string | null;
}

interface SyncHistoryTabProps {
  onRerunSync: (filters: any) => void;
}

export const SyncHistoryTab = ({ onRerunSync }: SyncHistoryTabProps) => {
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { devMode } = useDevMode();
  const { toast } = useToast();

  useEffect(() => {
    fetchSyncHistory();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('sync-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_history'
        },
        () => {
          fetchSyncHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSyncHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("sync_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching sync history:", error);
        setError(error.message);
        throw error;
      }
      setSyncHistory(data || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching sync history:", error);
      setError(error.message || "Failed to fetch sync history");
    } finally {
      setLoading(false);
    }
  };

  const handleStopSync = async (syncId: string) => {
    try {
      const { error } = await supabase.functions.invoke("cancel-sync", {
        body: { syncId },
      });

      if (error) throw error;

      toast({
        title: "Sync stopped",
        description: "The sync has been cancelled.",
      });
      
      fetchSyncHistory();
    } catch (error: any) {
      console.error("Error stopping sync:", error);
      toast({
        title: "Stop failed",
        description: error.message || "Failed to stop sync",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSync = async (syncId: string) => {
    try {
      const { error } = await supabase
        .from("sync_history")
        .delete()
        .eq("id", syncId);

      if (error) throw error;

      toast({
        title: "Sync deleted",
        description: "Sync history record has been deleted.",
      });
      
      fetchSyncHistory();
    } catch (error: any) {
      console.error("Error deleting sync:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete sync history",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      cancelled: "outline",
    };
    return variants[status] || "outline";
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'cancelled':
        return <StopCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {devMode === 'admin' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Dev mode is active. You're viewing the admin interface with mock permissions. 
            To see actual sync history data, please sign in as a real admin user.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes('permission') || error.includes('policy') 
              ? 'You need admin permissions to view sync history. Please sign in with an admin account.'
              : `Error loading sync history: ${error}`
            }
          </AlertDescription>
        </Alert>
      )}

      {syncHistory.length === 0 && !loading && !error ? (
        <div className="py-12 text-center space-y-4">
          <div className="text-muted-foreground text-4xl">📊</div>
          <p className="text-muted-foreground text-base font-medium">No sync history yet</p>
          <p className="text-muted-foreground text-sm">
            Run your first sync from the "Sync Movies" tab to see results here
          </p>
        </div>
      ) : (
        syncHistory.map((sync) => (
          <div key={sync.id} className="border-b pb-8 last:border-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium">
                    {sync.sync_mode ? "🔄 Sync" : "📥 Import"}
                  </h3>
                  {sync.completed_at && (
                    <Badge variant="outline" className="text-xs">
                      ⏱️ {calculateDuration(sync.created_at, sync.completed_at)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Started: {format(new Date(sync.created_at), "PPp")}
                  </p>
                  {sync.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      • Ended: {format(new Date(sync.completed_at), "PPp")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getStatusVariant(sync.status)} 
                  className="flex items-center gap-1.5"
                >
                  {getStatusIcon(sync.status)}
                  {sync.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              {sync.status === 'running' ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStopSync(sync.id)}
                >
                  <StopCircle className="h-3 w-3 mr-1" />
                  Stop Sync
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRerunSync(sync.filters)}
                  >
                    <RotateCw className="h-3 w-3 mr-1" />
                    Re-run
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSync(sync.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
              <div>
                <div className="text-lg font-semibold">{sync.total_found}</div>
                <div className="text-xs text-muted-foreground">Found</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{sync.imported}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{sync.updated}</div>
                <div className="text-xs text-muted-foreground">Updated</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{sync.removed}</div>
                <div className="text-xs text-muted-foreground">Removed</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{sync.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{sync.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Summary Indicator */}
            {sync.status === 'completed' && (
              <div className="mt-4 p-3 rounded-md bg-muted/30 text-sm">
                {sync.failed === 0 && sync.skipped === 0 ? (
                  <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Sync completed successfully! All {sync.imported + sync.updated} items processed.
                  </p>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Sync completed with {sync.failed} failures and {sync.skipped} skipped items.
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {sync.error_message && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">❌ SYNC FAILED</div>
                  <div className="text-sm">{sync.error_message}</div>
                  {sync.logs && sync.logs.some(log => log.includes('✗')) && (
                    <Collapsible className="mt-2">
                      <CollapsibleTrigger className="text-xs font-medium hover:underline cursor-pointer">
                        View Error Logs ▼
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-destructive/5 rounded p-2 max-h-32 overflow-auto space-y-1">
                          {sync.logs.filter(log => log.includes('✗')).map((log, index) => (
                            <div key={index} className="text-xs font-mono">
                              {log}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Details */}
            {((sync.filters && Object.keys(sync.filters).length > 0) || (sync.logs && sync.logs.length > 0)) && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-4 w-4" />
                  View Details
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {sync.filters && Object.keys(sync.filters).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Filters</h4>
                      <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto">
                        {JSON.stringify(sync.filters, null, 2)}
                      </pre>
                    </div>
                  )}
                  {sync.logs && sync.logs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        Logs ({sync.logs.length})
                      </h4>
                      <div className="bg-muted/30 p-3 rounded max-h-64 overflow-auto space-y-1">
                        {sync.logs.map((log, index) => (
                          <div key={index} className="text-xs font-mono">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ))
      )}
    </div>
  );
};
