import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleManagement } from "./RoleManagement";
import { SubscriptionManagement } from "./SubscriptionManagement";

export const AccessControl = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <div>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                Manage user roles and subscription tiers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
        <RoleManagement />
        <SubscriptionManagement />
      </div>
    </div>
  );
};
