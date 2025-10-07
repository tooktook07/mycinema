import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "@/lib/adminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users } from "lucide-react";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";

export const RoleManagement = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAllUsers(),
  });

  const adminUsers = users?.filter(u => u.roles?.includes('admin')) || [];
  const regularUsers = users?.filter(u => !u.roles?.includes('admin')) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : adminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No administrators found</p>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <UserAvatar userId={user.user_id} email={user.email} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.email || 'No email'}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.user_id.substring(0, 12)}...
                      </div>
                    </div>
                    <RoleBadge role="admin" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Regular Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{regularUsers.length}</p>
                <p className="text-sm text-muted-foreground">
                  Total regular users in the system
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <RoleBadge role="admin" />
                  <span className="font-medium">Administrators</span>
                </div>
                <span className="text-2xl font-bold">{adminUsers.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <RoleBadge role="user" />
                  <span className="font-medium">Regular Users</span>
                </div>
                <span className="text-2xl font-bold">{regularUsers.length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
