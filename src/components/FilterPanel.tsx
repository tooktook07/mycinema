import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterPanelProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  onApply: () => void;
  onReset: () => void;
}

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Thriller",
  "Romance",
  "Documentary",
  "Animation",
  "Fantasy",
];

export const FilterPanel = ({
  selectedGenres,
  onGenreToggle,
  minRating,
  onMinRatingChange,
  yearRange,
  onYearRangeChange,
  onApply,
  onReset,
}: FilterPanelProps) => {
  return (
    <div className="space-y-6 rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <Label className="mb-3 text-lg font-semibold text-foreground">Genres</Label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenres.includes(genre) ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => onGenreToggle(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-3 text-lg font-semibold text-foreground">
            Minimum IMDB Score: {minRating.toFixed(1)}
          </Label>
          <Slider
            value={[minRating]}
            onValueChange={([value]) => onMinRatingChange(value)}
            min={0}
            max={10}
            step={0.1}
            className="w-full"
          />
        </div>

        <div>
          <Label className="mb-3 text-lg font-semibold text-foreground">Release Year Range</Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="year-from" className="mb-2 text-sm text-muted-foreground">
                From
              </Label>
              <Input
                id="year-from"
                type="number"
                value={yearRange[0]}
                onChange={(e) => onYearRangeChange([parseInt(e.target.value) || 1900, yearRange[1]])}
                min={1900}
                max={yearRange[1]}
                className="bg-background"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="year-to" className="mb-2 text-sm text-muted-foreground">
                To
              </Label>
              <Input
                id="year-to"
                type="number"
                value={yearRange[1]}
                onChange={(e) => onYearRangeChange([yearRange[0], parseInt(e.target.value) || 2024])}
                min={yearRange[0]}
                max={2024}
                className="bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onReset}>
          Reset Filters
        </Button>
        <Button onClick={onApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};
