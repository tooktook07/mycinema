import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SyncMovies } from "./Account/SyncMovies";
import { SyncHistoryTab } from "./Account/SyncHistoryTab";
import { GeneralSettings } from "./Account/GeneralSettings";
import { UserManagement } from "./Account/UserManagement";
import { ActivityLogs } from "./Account/ActivityLogs";
import { RoleManagement } from "./Account/RoleManagement";
import { SubscriptionManagement } from "./Account/SubscriptionManagement";
import { OMDbEnrichment } from "./Account/OMDbEnrichment";
import { PosterStorage } from "./Account/PosterStorage";
import { useAuth } from "@/contexts/AuthContext";

const Account = () => {
  const { isAdmin } = useAuth();
  const loading = false;
  const navigate = useNavigate();

  // Lifted filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Released"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([6.0, 10.0]);
  const [yearRange, setYearRange] = useState<[number, number]>([2020, 2025]);
  const [minVoteCount, setMinVoteCount] = useState(1000);
  const [minPopularity, setMinPopularity] = useState(0);
  
  // Tab and re-run state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [autoStart, setAutoStart] = useState(false);

  const handleGenreToggle = (genre: string) => {
    if (!genre) {
      setSelectedGenres([]);
      return;
    }
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleExcludedGenreToggle = (genre: string) => {
    if (!genre) {
      setExcludedGenres([]);
      return;
    }
    setExcludedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleLanguageToggle = (language: string) => {
    if (!language) {
      setSelectedLanguages([]);
      return;
    }
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleRerunSync = (filters: any) => {
    // Populate filters from history
    if (filters.genres) setSelectedGenres(filters.genres);
    if (filters.excludedGenres) setExcludedGenres(filters.excludedGenres);
    if (filters.statuses) setSelectedStatuses(filters.statuses);
    if (filters.languages) setSelectedLanguages(filters.languages);
    if (filters.minRating !== undefined && filters.maxRating !== undefined) {
      setRatingRange([filters.minRating, filters.maxRating]);
    }
    if (filters.yearRange) setYearRange(filters.yearRange);
    if (filters.minVoteCount !== undefined) setMinVoteCount(filters.minVoteCount);
    if (filters.minPopularity !== undefined) setMinPopularity(filters.minPopularity);
    
    // Switch to sync tab and trigger sync
    setActiveTab("sync-movies");
    setAutoStart(true);
    
    // Reset auto-start after a brief delay
    setTimeout(() => setAutoStart(false), 100);
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
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="sync-movies">Sync Movies</TabsTrigger>
            <TabsTrigger value="omdb-enrichment">OMDb Enrichment</TabsTrigger>
            <TabsTrigger value="poster-storage">Poster Storage</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SyncHistoryTab onRerunSync={handleRerunSync} />
          </TabsContent>

          <TabsContent value="sync-movies">
            <SyncMovies
              autoStart={autoStart}
              selectedGenres={selectedGenres}
              onGenreToggle={handleGenreToggle}
              excludedGenres={excludedGenres}
              onExcludedGenreToggle={handleExcludedGenreToggle}
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              selectedLanguages={selectedLanguages}
              onLanguageToggle={handleLanguageToggle}
              ratingRange={ratingRange}
              onRatingRangeChange={setRatingRange}
              yearRange={yearRange}
              onYearRangeChange={setYearRange}
              minVoteCount={minVoteCount}
              onMinVoteCountChange={setMinVoteCount}
              minPopularity={minPopularity}
              onMinPopularityChange={setMinPopularity}
            />
          </TabsContent>

          <TabsContent value="omdb-enrichment">
            <OMDbEnrichment />
          </TabsContent>

          <TabsContent value="poster-storage">
            <PosterStorage />
          </TabsContent>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLogs />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
