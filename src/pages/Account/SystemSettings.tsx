import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLogs } from "./ActivityLogs";
import { GeneralSettings } from "./GeneralSettings";
import { CookieSettings } from "./CookieSettings";

export const SystemSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <div>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure general settings and monitor system activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityLogs />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <GeneralSettings />
          <CookieSettings />
        </div>
      </div>
    </div>
  );
};
