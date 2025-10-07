import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useFilters } from "@/contexts/FilterContext";

interface QuickFilterChipsProps {
  onGenreClick: (genre: string) => void;
  onYearClick: (startYear: number, endYear: number) => void;
  onRatingClick: (minRating: number, maxRating: number) => void;
}

export const QuickFilterChips = ({ onGenreClick, onYearClick, onRatingClick }: QuickFilterChipsProps) => {
  const { appliedGenres, appliedYearRange, appliedRatingRange } = useFilters();
  
  const currentYear = new Date().getFullYear();
  
  const genreChips = [
    { label: "Action", value: "Action" },
    { label: "Drama", value: "Drama" },
    { label: "Comedy", value: "Comedy" },
    { label: "Sci-Fi", value: "Science Fiction" },
    { label: "Horror", value: "Horror" },
    { label: "Thriller", value: "Thriller" },
  ];
  
  const eraChips = [
    { label: "Recent (2020+)", start: 2020, end: currentYear },
    { label: "2010s", start: 2010, end: 2019 },
    { label: "2000s", start: 2000, end: 2009 },
    { label: "90s", start: 1990, end: 1999 },
    { label: "Classics (<1990)", start: 1900, end: 1989 },
  ];
  
  const qualityChips = [
    { label: "Highly Rated (8+)", min: 8, max: 10 },
    { label: "Hidden Gems (7-8)", min: 7, max: 8 },
    { label: "Classics (9+)", min: 9, max: 10 },
  ];

  const isGenreActive = (genre: string) => appliedGenres.includes(genre);
  const isYearActive = (start: number, end: number) => 
    appliedYearRange[0] === start && appliedYearRange[1] === end;
  const isRatingActive = (min: number, max: number) =>
    appliedRatingRange[0] === min && appliedRatingRange[1] === max;

  return (
    <div className="mb-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-4">
          {/* Genre Chips */}
          {genreChips.map((chip) => (
            <Badge
              key={chip.value}
              variant={isGenreActive(chip.value) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onGenreClick(chip.value)}
            >
              {chip.label}
              {isGenreActive(chip.value) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
          
          {/* Era Chips */}
          {eraChips.map((chip) => (
            <Badge
              key={chip.label}
              variant={isYearActive(chip.start, chip.end) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onYearClick(chip.start, chip.end)}
            >
              {chip.label}
              {isYearActive(chip.start, chip.end) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
          
          {/* Quality Chips */}
          {qualityChips.map((chip) => (
            <Badge
              key={chip.label}
              variant={isRatingActive(chip.min, chip.max) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onRatingClick(chip.min, chip.max)}
            >
              {chip.label}
              {isRatingActive(chip.min, chip.max) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};