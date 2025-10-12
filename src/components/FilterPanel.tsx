import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterPanelProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  ratingRange: [number, number];
  onRatingRangeChange: (range: [number, number]) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
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
  ratingRange,
  onRatingRangeChange,
  yearRange,
  onYearRangeChange,
  searchText,
  onSearchTextChange,
  onReset,
}: FilterPanelProps) => {
  const isMobile = useIsMobile();
  const [localSearch, setLocalSearch] = useState(searchText);

  // Collapsible state with localStorage persistence
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("filterPanelOpen");
    if (saved !== null) return JSON.parse(saved);
    return false; // Collapsed by default
  });

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("filterPanelOpen", JSON.stringify(isOpen));
  }, [isOpen]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchTextChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchTextChange]);

  // Sync with external changes
  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const selectedCount =
    selectedGenres.length +
    (ratingRange[0] > 0 || ratingRange[1] < 10 ? 1 : 0) +
    (yearRange[0] !== 1900 || yearRange[1] !== 2030 ? 1 : 0) +
    (searchText ? 1 : 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-5 shadow-lg">
      {/* Header with Search - Always Visible */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {selectedCount > 0 && (
              <Badge variant="default" className="ml-2">
                {selectedCount} active
              </Badge>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse filters" : "Expand filters"}
            aria-expanded={isOpen}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search movies, actors, directors..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-10 h-10"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setLocalSearch("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Reset Button */}
        {selectedCount > 0 && (
          <Button variant="destructive" size="sm" onClick={onReset} className="font-semibold shrink-0">
            Reset All
          </Button>
        )}
      </div>

      {/* Collapsible Filter Sections */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Accordion type="multiple" defaultValue={["genres", "rating", "year"]} className="space-y-2">
            {/* Genres Section */}
            <AccordionItem value="genres" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">Genres</AccordionTrigger>
              <AccordionContent className="pb-3">
                <p className="text-xs text-muted-foreground mb-2 hidden sm:block">Select one or more genres</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2 max-h-48 overflow-y-auto p-2 rounded border border-border/50 bg-background/50">
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <Badge
                        key={genre}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all hover:scale-105 text-xs md:text-sm min-h-[32px] md:min-h-[36px]",
                          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                        onClick={() => onGenreToggle(genre)}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {genre}
                      </Badge>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Rating Section */}
            <AccordionItem value="rating" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>IMDb Rating</span>
                  <Badge variant="secondary" className="text-xs font-bold">
                    {ratingRange[0].toFixed(1)} - {ratingRange[1].toFixed(1)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-xs text-muted-foreground mb-3 hidden sm:block">
                  Filter by IMDb rating (falls back to TMDB if unavailable)
                </p>
                <div className="px-2">
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
              </AccordionContent>
            </AccordionItem>

            {/* Year Section */}
            <AccordionItem value="year" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                Release Year
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-xs text-muted-foreground mb-3 hidden sm:block">Set min and max year</p>
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
                      className="bg-background text-center font-semibold h-10 min-h-[44px]"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <span className="text-muted-foreground text-sm">to</span>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="year-to" className="text-xs text-muted-foreground mb-1.5 block">
                      To
                    </Label>
                    <Input
                      id="year-to"
                      type="number"
                      value={yearRange[1]}
                      onChange={(e) => onYearRangeChange([yearRange[0], parseInt(e.target.value) || 2024])}
                      min={yearRange[0]}
                      max={2024}
                      className="bg-background text-center font-semibold h-10 min-h-[44px]"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
