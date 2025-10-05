import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SyncMovies } from "./Account/SyncMovies";
import { SyncTvShows } from "./Account/SyncTvShows";
import { SyncHistoryTab } from "./Account/SyncHistoryTab";
import { GeneralSettings } from "./Account/GeneralSettings";
import { useAuth } from "@/contexts/AuthContext";

const Account = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

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

        <Tabs defaultValue="sync-movies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sync-movies">Sync Movies</TabsTrigger>
            <TabsTrigger value="sync-tv-shows">Sync TV Shows</TabsTrigger>
            <TabsTrigger value="sync-history">Sync History</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sync-movies">
            <SyncMovies />
          </TabsContent>

          <TabsContent value="sync-tv-shows">
            <SyncTvShows />
          </TabsContent>

          <TabsContent value="sync-history">
            <SyncHistoryTab />
          </TabsContent>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
