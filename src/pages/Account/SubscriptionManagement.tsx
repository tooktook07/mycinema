import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "@/lib/adminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionBadge } from "@/components/admin/SubscriptionBadge";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { format } from "date-fns";

export const SubscriptionManagement = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAllUsers(),
  });

  const freeUsers = users?.filter(u => u.subscription_tier === 'free') || [];
  const proUsers = users?.filter(u => u.subscription_tier === 'pro') || [];
  const activeSubscriptions = users?.filter(u => u.subscription_status === 'active') || [];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{freeUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((freeUsers.length / (users?.length || 1)) * 100).toFixed(1)}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{proUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((proUsers.length / (users?.length || 1)) * 100).toFixed(1)}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar userId={user.user_id} email={user.email} />
                            <div>
                              <div className="font-medium">{user.email || 'No email'}</div>
                              <div className="text-xs text-muted-foreground">
                                {user.user_id.substring(0, 12)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge 
                            tier={user.subscription_tier} 
                            status={user.subscription_status}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground capitalize">
                            {user.subscription_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.subscription_started_at
                            ? format(new Date(user.subscription_started_at), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.subscription_expires_at
                            ? format(new Date(user.subscription_expires_at), 'MMM d, yyyy')
                            : user.subscription_tier === 'pro' ? 'Never' : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
