import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useFilters } from "@/contexts/FilterContext";

interface QuickFilterChipsProps {
  onYearClick: (startYear: number, endYear: number) => void;
  onRatingClick: (minRating: number, maxRating: number) => void;
  onPopularityClick: (minPop: number, maxPop: number) => void;
  onAwardClick: (awardType: string) => void;
  onMixedClick: (type: string) => void;
}

export const QuickFilterChips = ({ onYearClick, onRatingClick, onPopularityClick, onAwardClick, onMixedClick }: QuickFilterChipsProps) => {
  const { appliedYearRange, appliedRatingRange, appliedPopularityRange, appliedSearchText } = useFilters();
  
  const currentYear = new Date().getFullYear();
  
  const eraChips = [
    { label: "Recent (2020+)", start: 2020, end: currentYear },
    { label: "2010s", start: 2010, end: 2019 },
    { label: "2000s", start: 2000, end: 2009 },
    { label: "90s", start: 1990, end: 1999 },
  ];
  
  const qualityChips = [
    { label: "Highly Rated (8+)", min: 8, max: 10 },
    { label: "Hidden Gems (7-8)", min: 7, max: 8 },
    { label: "Classics (9+)", min: 9, max: 10 },
  ];

  const awardChips = [
    { label: "Oscar Winners", searchTerm: "Oscar" },
    { label: "Award Winners", searchTerm: "Won" },
    { label: "Nominated", searchTerm: "Nominated" },
  ];

  const popularityChips = [
    { label: "Trending (Pop 100+)", min: 100, max: 1000 },
    { label: "Popular (50-100)", min: 50, max: 100 },
    { label: "Hidden Gems (Pop <20)", min: 0, max: 20 },
  ];

  const mixedChips = [
    { label: "Critical Darlings", type: "critical" },
    { label: "Audience Favorites", type: "audience" },
    { label: "Box Office Hits", type: "boxoffice" },
  ];

  const isYearActive = (start: number, end: number) => 
    appliedYearRange[0] === start && appliedYearRange[1] === end;
  const isRatingActive = (min: number, max: number) =>
    appliedRatingRange[0] === min && appliedRatingRange[1] === max;
  const isPopularityActive = (min: number, max: number) =>
    appliedPopularityRange[0] === min && appliedPopularityRange[1] === max;
  const isAwardActive = (searchTerm: string) =>
    appliedSearchText.toLowerCase().includes(searchTerm.toLowerCase());
  const isMixedActive = (type: string) => {
    if (type === "critical") return appliedSearchText.includes("metascore") || (appliedRatingRange[0] >= 8 && appliedPopularityRange[1] <= 20);
    if (type === "audience") return appliedRatingRange[0] >= 7 && appliedPopularityRange[0] >= 50;
    if (type === "boxoffice") return appliedSearchText.includes("revenue");
    return false;
  };

  return (
    <div className="mb-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-4">
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

          {/* Award Chips */}
          {awardChips.map((chip) => (
            <Badge
              key={chip.label}
              variant={isAwardActive(chip.searchTerm) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onAwardClick(chip.searchTerm)}
            >
              {chip.label}
              {isAwardActive(chip.searchTerm) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}

          {/* Popularity Chips */}
          {popularityChips.map((chip) => (
            <Badge
              key={chip.label}
              variant={isPopularityActive(chip.min, chip.max) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onPopularityClick(chip.min, chip.max)}
            >
              {chip.label}
              {isPopularityActive(chip.min, chip.max) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}

          {/* Mixed Cool Combos */}
          {mixedChips.map((chip) => (
            <Badge
              key={chip.label}
              variant={isMixedActive(chip.type) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
              onClick={() => onMixedClick(chip.type)}
            >
              {chip.label}
              {isMixedActive(chip.type) && <X className="ml-1 h-3 w-3" />}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};