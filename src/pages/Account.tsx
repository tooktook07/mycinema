import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SyncMovies } from "./Account/SyncMovies";
import { SyncHistoryTab } from "./Account/SyncHistoryTab";
import { GeneralSettings } from "./Account/GeneralSettings";
import { useEffectiveAuth } from "@/contexts/DevModeContext";

const Account = () => {
  const { isAdmin } = useEffectiveAuth();
  const loading = false;
  const navigate = useNavigate();
  
  // Lift filter state to enable re-run
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Released"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([6.9, 9.5]);
  const [yearRange, setYearRange] = useState<[number, number]>([2025, 2025]);
  const [minVoteCount, setMinVoteCount] = useState(1000);
  const [minPopularity, setMinPopularity] = useState(0);
  
  const [activeTab, setActiveTab] = useState("sync-movies");
  const [rerunFilters, setRerunFilters] = useState<any>(null);
  const [autoStart, setAutoStart] = useState(false);

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

  const handleRerunSync = (filters: any) => {
    setRerunFilters(filters);
    setActiveTab("sync-movies");
    setAutoStart(true);
    
    // Reset auto-start after a moment
    setTimeout(() => setAutoStart(false), 100);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Account</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync-movies">Sync Movies</TabsTrigger>
            <TabsTrigger value="sync-history">Sync History</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="sync-movies">
            <SyncMovies 
              initialFilters={rerunFilters}
              autoStart={autoStart}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
              excludedGenres={excludedGenres}
              setExcludedGenres={setExcludedGenres}
              selectedStatuses={selectedStatuses}
              setSelectedStatuses={setSelectedStatuses}
              selectedLanguages={selectedLanguages}
              setSelectedLanguages={setSelectedLanguages}
              ratingRange={ratingRange}
              setRatingRange={setRatingRange}
              yearRange={yearRange}
              setYearRange={setYearRange}
              minVoteCount={minVoteCount}
              setMinVoteCount={setMinVoteCount}
              minPopularity={minPopularity}
              setMinPopularity={setMinPopularity}
            />
          </TabsContent>

          <TabsContent value="sync-history">
            <SyncHistoryTab onRerunSync={handleRerunSync} />
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
