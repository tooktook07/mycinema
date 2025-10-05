import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

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

export const SyncHistoryTab = () => {
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncHistory();
  }, []);

  const fetchSyncHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("sync_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSyncHistory(data || []);
    } catch (error) {
      console.error("Error fetching sync history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syncHistory.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No sync history found</p>
          </CardContent>
        </Card>
      ) : (
        syncHistory.map((sync) => (
          <Card key={sync.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(sync.status)}
                  <div>
                    <CardTitle className="text-xl">
                      {sync.sync_mode ? "Sync" : "Import"} Operation
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(sync.created_at), "PPpp")}
                      {sync.completed_at && (
                        <> - Completed {format(new Date(sync.completed_at), "PPpp")}</>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(sync.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">{sync.total_found}</div>
                  <div className="text-xs text-muted-foreground">Found</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-green-600">{sync.imported}</div>
                  <div className="text-xs text-muted-foreground">Imported</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-blue-600">{sync.updated}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-orange-600">{sync.removed}</div>
                  <div className="text-xs text-muted-foreground">Removed</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-gray-600">{sync.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold text-red-600">{sync.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* Error Message */}
              {sync.error_message && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                  <strong>Error:</strong> {sync.error_message}
                </div>
              )}

              {/* Filters & Logs */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="filters">
                  <AccordionTrigger>Filters Applied</AccordionTrigger>
                  <AccordionContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                      {JSON.stringify(sync.filters, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
                {sync.logs && sync.logs.length > 0 && (
                  <AccordionItem value="logs">
                    <AccordionTrigger>
                      Logs ({sync.logs.length} entries)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                        {sync.logs.map((log, index) => (
                          <div key={index} className="text-xs font-mono py-1 border-b last:border-0">
                            {log}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
