import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VoteTierConfig } from "@/data/types";

interface SyncFilterPanelProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  excludedGenres: string[];
  onExcludedGenreToggle: (genre: string) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
  ratingRange: [number, number];
  onRatingRangeChange: (range: [number, number]) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  voteTiers: VoteTierConfig;
  onVoteTiersChange: (tiers: VoteTierConfig) => void;
  minPopularity: number;
  onMinPopularityChange: (value: number) => void;
  selectedLanguages: string[];
  onLanguageToggle: (language: string) => void;
}

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Science Fiction",
  "Thriller",
  "Romance",
  "Documentary",
  "Animation",
  "Fantasy",
  "Adventure",
  "Crime",
  "Mystery",
];

const STATUSES = [
  "Released",
  "Post Production",
  "In Production",
  "Planned",
  "Rumored",
  "Canceled",
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

export const SyncFilterPanel = ({
  selectedGenres,
  onGenreToggle,
  excludedGenres,
  onExcludedGenreToggle,
  selectedStatuses,
  onStatusToggle,
  ratingRange,
  onRatingRangeChange,
  yearRange,
  onYearRangeChange,
  voteTiers,
  onVoteTiersChange,
  minPopularity,
  onMinPopularityChange,
  selectedLanguages,
  onLanguageToggle,
}: SyncFilterPanelProps) => {
  const currentYear = new Date().getFullYear();
  
  const selectedCount = selectedGenres.length + 
    excludedGenres.length +
    selectedStatuses.length +
    selectedLanguages.length +
    (ratingRange[0] > 6.0 || ratingRange[1] < 10 ? 1 : 0) + 
    (yearRange[0] !== 2020 || yearRange[1] !== 2025 ? 1 : 0) +
    (voteTiers.currentYear !== 300 || voteTiers.lastYear !== 500 || voteTiers.twoToThreeYears !== 750 || voteTiers.older !== 1000 ? 1 : 0) +
    (minPopularity > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Sync Filters
          {selectedCount > 0 && (
            <Badge variant="default" className="ml-2">
              {selectedCount} active
            </Badge>
          )}
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3 md:col-span-2 lg:col-span-1">
          <div>
            <Label className="text-base font-semibold text-foreground">Include Genres</Label>
            <p className="text-xs text-muted-foreground mt-1">Select genres to sync (leave empty for all)</p>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background/50">
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <Badge
                  key={genre}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  onClick={() => onGenreToggle(genre)}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {genre}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2 lg:col-span-1">
          <div>
            <Label className="text-base font-semibold text-foreground">Exclude Genres</Label>
            <p className="text-xs text-muted-foreground mt-1">Select genres to exclude from sync</p>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background/50">
            {GENRES.map((genre) => {
              const isExcluded = excludedGenres.includes(genre);
              return (
                <Badge
                  key={genre}
                  variant={isExcluded ? "destructive" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    isExcluded && "ring-2 ring-destructive ring-offset-2 ring-offset-background"
                  )}
                  onClick={() => onExcludedGenreToggle(genre)}
                >
                  {isExcluded && <span className="mr-1">✗</span>}
                  {genre}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2 lg:col-span-1">
          <div>
            <Label className="text-base font-semibold text-foreground">Movie Status</Label>
            <p className="text-xs text-muted-foreground mt-1">Select statuses to sync (leave empty for all)</p>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background/50">
            {STATUSES.map((status) => {
              const isSelected = selectedStatuses.includes(status);
              return (
                <Badge
                  key={status}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  onClick={() => onStatusToggle(status)}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {status}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2 lg:col-span-1">
          <div>
            <Label className="text-base font-semibold text-foreground">Languages</Label>
            <p className="text-xs text-muted-foreground mt-1">Select languages to sync (leave empty for all)</p>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background/50">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguages.includes(lang.code);
              return (
                <Badge
                  key={lang.code}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  onClick={() => onLanguageToggle(lang.code)}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {lang.code.toUpperCase()} - {lang.name}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold text-foreground flex items-center justify-between">
              <span>IMDB Score Range</span>
              <Badge variant="secondary" className="text-sm font-bold">
                {ratingRange[0].toFixed(1)} - {ratingRange[1].toFixed(1)}
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">Filter by rating range</p>
          </div>
          <div className="pt-2">
            <Slider
              value={ratingRange}
              onValueChange={(values) => onRatingRangeChange(values as [number, number])}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0.0</span>
              <span>5.0</span>
              <span>10.0</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold text-foreground">Year Range</Label>
            <p className="text-xs text-muted-foreground mt-1">Set min and max year</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="year-from" className="text-xs text-muted-foreground mb-1.5 block">
                From
              </Label>
              <Input
                id="year-from"
                type="number"
                value={yearRange[0]}
                onChange={(e) => onYearRangeChange([parseInt(e.target.value) || 1900, yearRange[1]])}
                min={1900}
                max={yearRange[1]}
                className="bg-background text-center font-semibold"
              />
            </div>
            <div className="flex items-end pb-2">
              <span className="text-muted-foreground">to</span>
            </div>
            <div className="flex-1">
              <Label htmlFor="year-to" className="text-xs text-muted-foreground mb-1.5 block">
                To
              </Label>
              <Input
                id="year-to"
                type="number"
                value={yearRange[1]}
                onChange={(e) => onYearRangeChange([yearRange[0], parseInt(e.target.value) || 2025])}
                min={yearRange[0]}
                max={2030}
                className="bg-background text-center font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 md:col-span-2">
          <div>
            <Label className="text-base font-semibold text-foreground">Vote Count Tiers</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Set minimum vote requirements based on movie age
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tier-current" className="text-xs text-muted-foreground mb-1.5 block">
                Current Year ({currentYear})
              </Label>
              <Input
                id="tier-current"
                type="number"
                value={voteTiers.currentYear}
                onChange={(e) => onVoteTiersChange({ ...voteTiers, currentYear: parseInt(e.target.value) || 0 })}
                min={0}
                max={10000}
                step={50}
                className="bg-background text-center font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="tier-last" className="text-xs text-muted-foreground mb-1.5 block">
                Last Year ({currentYear - 1})
              </Label>
              <Input
                id="tier-last"
                type="number"
                value={voteTiers.lastYear}
                onChange={(e) => onVoteTiersChange({ ...voteTiers, lastYear: parseInt(e.target.value) || 0 })}
                min={0}
                max={10000}
                step={50}
                className="bg-background text-center font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="tier-2-3" className="text-xs text-muted-foreground mb-1.5 block">
                2-3 Years ({currentYear - 3}-{currentYear - 2})
              </Label>
              <Input
                id="tier-2-3"
                type="number"
                value={voteTiers.twoToThreeYears}
                onChange={(e) => onVoteTiersChange({ ...voteTiers, twoToThreeYears: parseInt(e.target.value) || 0 })}
                min={0}
                max={10000}
                step={50}
                className="bg-background text-center font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="tier-older" className="text-xs text-muted-foreground mb-1.5 block">
                Older (≤{currentYear - 4})
              </Label>
              <Input
                id="tier-older"
                type="number"
                value={voteTiers.older}
                onChange={(e) => onVoteTiersChange({ ...voteTiers, older: parseInt(e.target.value) || 0 })}
                min={0}
                max={10000}
                step={50}
                className="bg-background text-center font-semibold"
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/50 border">
            <div className="font-medium mb-1">Current Tier Settings:</div>
            <div>• {currentYear}: {voteTiers.currentYear.toLocaleString()}+ votes</div>
            <div>• {currentYear - 1}: {voteTiers.lastYear.toLocaleString()}+ votes</div>
            <div>• {currentYear - 3}-{currentYear - 2}: {voteTiers.twoToThreeYears.toLocaleString()}+ votes</div>
            <div>• ≤{currentYear - 4}: {voteTiers.older.toLocaleString()}+ votes</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold text-foreground flex items-center justify-between">
              <span>Minimum Popularity</span>
              <Badge variant="secondary" className="text-sm font-bold">
                {minPopularity}+
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">Filter by minimum popularity score</p>
          </div>
          <div className="pt-2">
            <Slider
              value={[minPopularity]}
              onValueChange={([value]) => onMinPopularityChange(value)}
              min={0}
              max={1000}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0</span>
              <span>500</span>
              <span>1,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
