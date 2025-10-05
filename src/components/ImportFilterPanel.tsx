import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImportFilterPanelProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  ratingRange: [number, number];
  onRatingRangeChange: (range: [number, number]) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  minVoteCount: number;
  onMinVoteCountChange: (value: number) => void;
  minPopularity: number;
  onMinPopularityChange: (value: number) => void;
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

export const ImportFilterPanel = ({
  selectedGenres,
  onGenreToggle,
  ratingRange,
  onRatingRangeChange,
  yearRange,
  onYearRangeChange,
  minVoteCount,
  onMinVoteCountChange,
  minPopularity,
  onMinPopularityChange,
}: ImportFilterPanelProps) => {
  const selectedCount = selectedGenres.length + 
    (ratingRange[0] > 0 || ratingRange[1] < 10 ? 1 : 0) + 
    (yearRange[0] !== 2025 || yearRange[1] !== 2025 ? 1 : 0) +
    (minVoteCount > 0 ? 1 : 0) +
    (minPopularity > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Import Filters
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
            <Label className="text-base font-semibold text-foreground">Genres</Label>
            <p className="text-xs text-muted-foreground mt-1">Select genres to import</p>
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
                onChange={(e) => onYearRangeChange([parseInt(e.target.value) || 2020, yearRange[1]])}
                min={2020}
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

        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold text-foreground flex items-center justify-between">
              <span>Minimum Vote Count</span>
              <Badge variant="secondary" className="text-sm font-bold">
                {minVoteCount}+
              </Badge>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">Filter by minimum number of votes</p>
          </div>
          <div className="pt-2">
            <Slider
              value={[minVoteCount]}
              onValueChange={([value]) => onMinVoteCountChange(value)}
              min={0}
              max={10000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0</span>
              <span>5,000</span>
              <span>10,000</span>
            </div>
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
