import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

interface SearchPanelProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  resultCount?: number;
}

export const SearchPanel = ({
  searchText,
  onSearchTextChange,
  resultCount,
}: SearchPanelProps) => {
  const [localSearch, setLocalSearch] = useState(searchText);

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

  const handleClear = () => {
    setLocalSearch("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, actors, director, plot..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-11 pr-10 h-11 text-base"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Result Count */}
        {searchText && resultCount !== undefined && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </div>
        )}
      </div>

      {/* Search Tips */}
      {!localSearch && (
        <p className="text-xs text-muted-foreground">
          Search across title, actors, directors, plot, genres, and more
        </p>
      )}
    </div>
  );
};
