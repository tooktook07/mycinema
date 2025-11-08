import { useState, useEffect } from "react";
import { Database, Cloud, Image, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncMovies } from "./SyncMovies";
import { OMDbEnrichment } from "./OMDbEnrichment";
import { PosterStorage } from "./PosterStorage";
import { MovieImportChecker } from "./MovieImportChecker";
import { VoteTierConfig } from "@/data/types";

interface DataPipelineProps {
  initialTab?: string;
  initialFilters?: {
    genres?: string[];
    excludedGenres?: string[];
    statuses?: string[];
    languages?: string[];
    minRating?: number;
    maxRating?: number;
    yearRange?: [number, number];
    voteTiers?: VoteTierConfig;
    minPopularity?: number;
  };
  autoStart?: boolean;
}

export const DataPipeline = ({ initialTab = "sync", initialFilters, autoStart = false }: DataPipelineProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Filter states for TMDB sync
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialFilters?.genres || []);
  const [excludedGenres, setExcludedGenres] = useState<string[]>(initialFilters?.excludedGenres || []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialFilters?.statuses || ["Released"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialFilters?.languages || []);
  const [ratingRange, setRatingRange] = useState<[number, number]>([
    initialFilters?.minRating || 6.0,
    initialFilters?.maxRating || 10.0
  ]);
  const [yearRange, setYearRange] = useState<[number, number]>(initialFilters?.yearRange || [2020, 2025]);
  const [voteTiers, setVoteTiers] = useState<VoteTierConfig>(
    initialFilters?.voteTiers || {
      currentYear: 300,
      lastYear: 500,
      twoToThreeYears: 750,
      older: 1000,
    }
  );
  const [minPopularity, setMinPopularity] = useState(initialFilters?.minPopularity || 0);
  const [triggerAutoStart, setTriggerAutoStart] = useState(autoStart);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.genres) setSelectedGenres(initialFilters.genres);
      if (initialFilters.excludedGenres) setExcludedGenres(initialFilters.excludedGenres);
      if (initialFilters.statuses) setSelectedStatuses(initialFilters.statuses);
      if (initialFilters.languages) setSelectedLanguages(initialFilters.languages);
      if (initialFilters.minRating !== undefined && initialFilters.maxRating !== undefined) {
        setRatingRange([initialFilters.minRating, initialFilters.maxRating]);
      }
      if (initialFilters.yearRange) setYearRange(initialFilters.yearRange);
      if (initialFilters.voteTiers) setVoteTiers(initialFilters.voteTiers);
      if (initialFilters.minPopularity !== undefined) setMinPopularity(initialFilters.minPopularity);
    }
  }, [initialFilters]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6" />
            <div>
              <CardTitle>Data Pipeline Management</CardTitle>
              <CardDescription>
                Manage your movie data sources: sync from TMDB, enrich with OMDb, and store posters locally
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sync" className="gap-2">
                <Cloud className="h-4 w-4" />
                TMDB Sync
              </TabsTrigger>
              <TabsTrigger value="omdb" className="gap-2">
                <Database className="h-4 w-4" />
                OMDb Enrichment
              </TabsTrigger>
              <TabsTrigger value="posters" className="gap-2">
                <Image className="h-4 w-4" />
                Poster Storage
              </TabsTrigger>
              <TabsTrigger value="checker" className="gap-2">
                <Search className="h-4 w-4" />
                Movie Checker
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="mt-6">
              <SyncMovies
                autoStart={triggerAutoStart}
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
                voteTiers={voteTiers}
                onVoteTiersChange={setVoteTiers}
                minPopularity={minPopularity}
                onMinPopularityChange={setMinPopularity}
              />
            </TabsContent>

            <TabsContent value="omdb" className="mt-6">
              <OMDbEnrichment />
            </TabsContent>

            <TabsContent value="posters" className="mt-6">
              <PosterStorage />
            </TabsContent>

            <TabsContent value="checker" className="mt-6">
              <MovieImportChecker
                currentFilters={{
                  minRating: ratingRange[0],
                  maxRating: ratingRange[1],
                  voteTiers,
                  yearRange,
                  genres: selectedGenres,
                  excludedGenres,
                  languages: selectedLanguages,
                  statuses: selectedStatuses,
                  minPopularity,
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
