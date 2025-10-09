import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, AlertCircle, CheckCircle2, XCircle, AlertTriangle, RotateCw, Trash2, StopCircle, Bot, User, TrendingUp, Calendar, Clock, Database, Activity } from "lucide-react";
import { format, addHours } from "date-fns";
import { useDevMode } from "@/contexts/DevModeContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SyncHistoryRecord {
  id: string;
  created_at: string;
  completed_at: string | null;
  sync_mode: boolean;
  sync_type: string;
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
  trigger_source: 'manual' | 'automated';
}

interface SyncHistoryTabProps {
  onRerunSync: (filters: any) => void;
}

interface CronJobSchedule {
  name: string;
  schedule: string;
  nextRun: Date;
  description: string;
  emoji: string;
}

export const SyncHistoryTab = ({ onRerunSync }: SyncHistoryTabProps) => {
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'manual' | 'automated'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tmdb_import' | 'omdb_enrichment' | 'poster_storage'>('all');
  const [automationStats, setAutomationStats] = useState<{
    totalAutomated: number;
    totalManual: number;
    automatedSuccessRate: number;
  }>({ totalAutomated: 0, totalManual: 0, automatedSuccessRate: 0 });
  const [movieStats, setMovieStats] = useState<{
    totalMovies: number;
    moviesWithPosters: number;
    enrichedMovies: number;
  }>({ totalMovies: 0, moviesWithPosters: 0, enrichedMovies: 0 });
  const [cycleInfo, setCycleInfo] = useState<{
    currentDay: number;
    moviesProcessed: number;
    lastProcessed: string | null;
  } | null>(null);
  const { devMode } = useDevMode();
  const { toast } = useToast();

  // Calculate next cron job times
  const getNextCronRuns = (): CronJobSchedule[] => {
    const now = new Date();
    const jobs: CronJobSchedule[] = [];

    // Helper to get next occurrence of a specific time
    const getNextOccurrence = (hour: number, minute: number = 0): Date => {
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    };

    // Helper to get next Sunday at specific time
    const getNextSunday = (hour: number): Date => {
      const next = new Date(now);
      next.setHours(hour, 0, 0, 0);
      const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilSunday);
      if (next <= now) {
        next.setDate(next.getDate() + 7);
      }
      return next;
    };

    jobs.push({
      name: 'Sync Tracker Reset',
      schedule: '0 0 * * *',
      nextRun: getNextOccurrence(0, 0),
      description: 'Daily cycle tracker update',
      emoji: '🔄'
    });

    jobs.push({
      name: 'Daily Refresh Pipeline',
      schedule: '0 2 * * *',
      nextRun: getNextOccurrence(2, 0),
      description: 'Refresh ~120 movies with TMDB, OMDb & posters (30-day cycle)',
      emoji: '🔄'
    });

    jobs.push({
      name: 'New Movies Pipeline',
      schedule: '30 3 * * *',
      nextRun: getNextOccurrence(3, 30),
      description: 'Import new releases with full processing',
      emoji: '✨'
    });

    return jobs.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
  };

  useEffect(() => {
    fetchSyncHistory();
    fetchAutomationStats();
    fetchMovieStats();
    fetchCycleInfo();
    
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
          fetchAutomationStats();
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
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching sync history:", error);
        setError(error.message);
        throw error;
      }
      setSyncHistory((data || []) as SyncHistoryRecord[]);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching sync history:", error);
      setError(error.message || "Failed to fetch sync history");
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomationStats = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("sync_history")
        .select("trigger_source, status")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;

      const automated = data?.filter(s => s.trigger_source === 'automated') || [];
      const manual = data?.filter(s => s.trigger_source === 'manual') || [];
      const automatedSuccess = automated.filter(s => s.status === 'completed').length;

      setAutomationStats({
        totalAutomated: automated.length,
        totalManual: manual.length,
        automatedSuccessRate: automated.length > 0 
          ? Math.round((automatedSuccess / automated.length) * 100)
          : 0
      });
    } catch (error: any) {
      console.error("Error fetching automation stats:", error);
    }
  };

  const fetchMovieStats = async () => {
    try {
      const { count: total } = await supabase
        .from("movies")
        .select("*", { count: 'exact', head: true });

      const { count: withPosters } = await supabase
        .from("movies")
        .select("*", { count: 'exact', head: true })
        .not("local_poster_url", "is", null);

      const { count: enriched } = await supabase
        .from("movies")
        .select("*", { count: 'exact', head: true })
        .eq("data_sources->>omdb", "true");

      setMovieStats({
        totalMovies: total || 0,
        moviesWithPosters: withPosters || 0,
        enrichedMovies: enriched || 0
      });
    } catch (error: any) {
      console.error("Error fetching movie stats:", error);
    }
  };

  const fetchCycleInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("movie_sync_tracker")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCycleInfo({
          currentDay: data.cycle_day,
          moviesProcessed: data.movies_processed,
          lastProcessed: data.last_processed_at
        });
      }
    } catch (error: any) {
      console.error("Error fetching cycle info:", error);
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

  const getSyncTypeDisplay = (syncType: string) => {
    switch(syncType) {
      case 'omdb_enrichment':
        return {
          emoji: '✨',
          label: 'OMDb Enrichment',
          description: 'Enriching movies with OMDb data'
        };
      case 'tmdb_sync':
        return {
          emoji: '🔄',
          label: 'TMDB Sync',
          description: 'Syncing with TMDB database'
        };
      case 'poster_storage':
        return {
          emoji: '🖼️',
          label: 'Poster Storage',
          description: 'Downloading and storing movie posters'
        };
      case 'daily_refresh':
        return {
          emoji: '🔄',
          label: 'Daily Refresh',
          description: 'Automated daily refresh of existing movies'
        };
      case 'new_imports':
        return {
          emoji: '✨',
          label: 'New Imports',
          description: 'Automated import of new releases'
        };
      case 'tmdb_import':
      default:
        return {
          emoji: '📥',
          label: 'TMDB Import',
          description: 'Importing movies from TMDB'
        };
    }
  };

  const getTimeUntil = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  };

  const filteredHistory = syncHistory.filter(sync => {
    const matchesTrigger = triggerFilter === 'all' || sync.trigger_source === triggerFilter;
    const matchesType = typeFilter === 'all' || sync.sync_type === typeFilter;
    return matchesTrigger && matchesType;
  });

  const cronJobs = getNextCronRuns();
  const nextJob = cronJobs[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Next Scheduled Job - Prominent Display */}
      {nextJob && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Next Scheduled Job
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{nextJob.emoji}</span>
                  <h3 className="text-xl font-bold">{nextJob.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{nextJob.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{getTimeUntil(nextJob.nextRun)}</div>
                <p className="text-xs text-muted-foreground">{format(nextJob.nextRun, "PPp")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movies</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movieStats.totalMovies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stored Posters</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movieStats.moviesWithPosters.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {movieStats.totalMovies > 0 
                ? `${Math.round((movieStats.moviesWithPosters / movieStats.totalMovies) * 100)}% complete`
                : '0% complete'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OMDb Enriched</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movieStats.enrichedMovies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {movieStats.totalMovies > 0 
                ? `${Math.round((movieStats.enrichedMovies / movieStats.totalMovies) * 100)}% complete`
                : '0% complete'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cycle Tracker</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Day {cycleInfo?.currentDay || 1}/30</div>
            <p className="text-xs text-muted-foreground">
              {cycleInfo?.lastProcessed 
                ? `Updated ${format(new Date(cycleInfo.lastProcessed), "MMM d")}`
                : 'Not started'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Performance - Last 7 Days */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automated Syncs</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.totalAutomated}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Syncs</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.totalManual}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.automatedSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">Automated syncs</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Cron Jobs Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Automation Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cronJobs.map((job, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{job.emoji}</span>
                  <div>
                    <h4 className="font-medium">{job.name}</h4>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{getTimeUntil(job.nextRun)}</div>
                  <p className="text-xs text-muted-foreground">{format(job.nextRun, "PPp")}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sync History</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Trigger:</span>
            <Button
              size="sm"
              variant={triggerFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setTriggerFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={triggerFilter === 'manual' ? 'default' : 'outline'}
              onClick={() => setTriggerFilter('manual')}
            >
              👤 Manual
            </Button>
            <Button
              size="sm"
              variant={triggerFilter === 'automated' ? 'default' : 'outline'}
              onClick={() => setTriggerFilter('automated')}
            >
              🤖 Automated
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Type:</span>
            <Button
              size="sm"
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('all')}
            >
              All Types
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'tmdb_import' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('tmdb_import')}
            >
              📥 TMDB
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'omdb_enrichment' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('omdb_enrichment')}
            >
              ✨ OMDb
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'poster_storage' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('poster_storage')}
            >
              🖼️ Posters
            </Button>
          </div>
        </div>

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

        {filteredHistory.length === 0 && !loading && !error ? (
          <div className="py-12 text-center space-y-4">
            <div className="text-muted-foreground text-4xl">📊</div>
            <p className="text-muted-foreground text-base font-medium">
              {triggerFilter !== 'all' || typeFilter !== 'all' 
                ? 'No syncs match the current filters'
                : 'No sync history yet'
              }
            </p>
            <p className="text-muted-foreground text-sm">
              {triggerFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting the filters to see more results'
                : 'Run your first sync from the "Sync Movies" tab to see results here'
              }
            </p>
          </div>
        ) : (
          filteredHistory.map((sync) => (
            <div key={sync.id} className="border-b pb-8 last:border-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-medium">
                      {getSyncTypeDisplay(sync.sync_type).emoji} {getSyncTypeDisplay(sync.sync_type).label}
                    </h3>
                    <Badge variant={sync.trigger_source === 'automated' ? 'secondary' : 'outline'} className="text-xs">
                      {sync.trigger_source === 'automated' ? '🤖 Automated' : '👤 Manual'}
                    </Badge>
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
                    {sync.sync_type !== 'poster_storage' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRerunSync(sync.filters)}
                      >
                        <RotateCw className="h-3 w-3 mr-1" />
                        Re-run
                      </Button>
                    )}
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
              {sync.sync_type === 'omdb_enrichment' || sync.sync_type === 'poster_storage' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-lg font-semibold">{sync.total_found}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{sync.imported}</div>
                    <div className="text-xs text-muted-foreground">
                      {sync.sync_type === 'poster_storage' ? 'Downloaded' : 'Enriched'}
                    </div>
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
              ) : (
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
              )}

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
    </div>
  );
};