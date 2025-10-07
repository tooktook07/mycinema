import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllActivityLogs, Activity } from "@/lib/adminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Activity as ActivityIcon, Download } from "lucide-react";
import { format } from "date-fns";

export const ActivityLogs = () => {
  const [search, setSearch] = useState("");

  const { data: activities, isLoading } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: () => getAllActivityLogs({ limit: 100 }),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const filteredActivities = activities?.filter((activity) =>
    activity.action_type.toLowerCase().includes(search.toLowerCase()) ||
    activity.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCSV = () => {
    if (!activities) return;
    
    const csv = [
      ['User ID', 'Action', 'Details', 'IP Address', 'Timestamp'].join(','),
      ...activities.map(a => [
        a.user_id,
        a.action_type,
        JSON.stringify(a.action_details || {}),
        a.ip_address || 'N/A',
        a.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString()}.csv`;
    link.click();
  };

  const getActionBadgeVariant = (actionType: string) => {
    if (actionType.includes('login')) return 'default';
    if (actionType.includes('signup')) return 'default';
    if (actionType.includes('rated')) return 'secondary';
    if (actionType.includes('watchlist')) return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              <CardTitle>Activity Logs</CardTitle>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action type or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No activity logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities?.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="text-sm">
                          {format(new Date(activity.created_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {activity.user_id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(activity.action_type)}>
                            {activity.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.action_details ? JSON.stringify(activity.action_details) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {activity.ip_address || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing latest {filteredActivities?.length || 0} activities • Auto-refreshing every 10s
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
