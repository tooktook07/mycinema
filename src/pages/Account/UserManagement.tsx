import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllUsers, UserProfile } from "@/lib/adminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Download } from "lucide-react";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { SubscriptionBadge } from "@/components/admin/SubscriptionBadge";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { format } from "date-fns";

export const UserManagement = () => {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAllUsers(),
  });

  const filteredUsers = users?.filter((user) =>
    user.user_id.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCSV = () => {
    if (!users) return;
    
    const csv = [
      ['User ID', 'Email', 'Subscription', 'Status', 'Roles', 'Created At'].join(','),
      ...users.map(u => [
        u.user_id,
        u.email || 'N/A',
        u.subscription_tier,
        u.subscription_status,
        u.roles?.join(';') || 'user',
        u.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>All Users</CardTitle>
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
                placeholder="Search by user ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

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
                    <TableHead>User ID</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar userId={user.user_id} email={user.email} />
                            <div>
                              <div className="font-medium">{user.email || 'No email'}</div>
                              <div className="text-xs text-muted-foreground">
                                {user.theme} theme
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {user.user_id.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map(role => (
                                <RoleBadge key={role} role={role} />
                              ))
                            ) : (
                              <RoleBadge role="user" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge 
                            tier={user.subscription_tier} 
                            status={user.subscription_status}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.last_login_at
                            ? format(new Date(user.last_login_at), 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
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
