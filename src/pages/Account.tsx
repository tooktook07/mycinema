import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncMovies } from "./Account/SyncMovies";
import { SyncTvShows } from "./Account/SyncTvShows";
import { SyncHistoryTab } from "./Account/SyncHistoryTab";
import { GeneralSettings } from "./Account/GeneralSettings";

const Account = () => {
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
