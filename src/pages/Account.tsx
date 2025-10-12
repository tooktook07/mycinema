import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SyncHistoryTab } from "./Account/SyncHistoryTab";
import { UserManagement } from "./Account/UserManagement";
import { MovieManagement } from "./Account/MovieManagement";
import { DataPipeline } from "./Account/DataPipeline";
import { AccessControl } from "./Account/AccessControl";
import { SystemSettings } from "./Account/SystemSettings";
import { useAuth } from "@/contexts/AuthContext";

const Account = () => {
  const { isAdmin } = useAuth();
  const loading = false;
  const navigate = useNavigate();

  // Tab and re-run state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [rerunFilters, setRerunFilters] = useState<any>(null);
  const [rerunAutoStart, setRerunAutoStart] = useState(false);

  const handleRerunSync = (filters: any) => {
    // Store filters and switch to data pipeline tab
    setRerunFilters(filters);
    setRerunAutoStart(true);
    setActiveTab("data-pipeline");
    
    // Reset auto-start after a brief delay
    setTimeout(() => {
      setRerunAutoStart(false);
      setRerunFilters(null);
    }, 100);
  };

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This page is only accessible to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Account</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="data-pipeline">Data Pipeline</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="access-control">Access Control</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SyncHistoryTab onRerunSync={handleRerunSync} />
          </TabsContent>

          <TabsContent value="movies">
            <MovieManagement />
          </TabsContent>

          <TabsContent value="data-pipeline">
            <DataPipeline 
              initialFilters={rerunFilters}
              autoStart={rerunAutoStart}
            />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="access-control">
            <AccessControl />
          </TabsContent>

          <TabsContent value="system">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
