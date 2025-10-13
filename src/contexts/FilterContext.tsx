import React, { createContext, useContext, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FilterContextType {
  appliedGenres: string[];
  setAppliedGenres: (genres: string[]) => void;
  appliedRatingRange: [number, number];
  setAppliedRatingRange: (range: [number, number]) => void;
  appliedYearRange: [number, number];
  setAppliedYearRange: (range: [number, number]) => void;
  appliedSearchText: string;
  setAppliedSearchText: (text: string) => void;
  appliedPopularityRange: [number, number];
  setAppliedPopularityRange: (range: [number, number]) => void;
  appliedSortBy: string;
  setAppliedSortBy: (sortBy: string) => void;
  appliedSortOrder: string;
  setAppliedSortOrder: (sortOrder: string) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read from URL params
  const appliedGenres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const appliedRatingRange: [number, number] = searchParams.get('rating')
    ? searchParams.get('rating')!.split('-').map(Number) as [number, number]
    : [0, 10];
  const appliedYearRange: [number, number] = searchParams.get('year')
    ? searchParams.get('year')!.split('-').map(Number) as [number, number]
    : [1900, 2030];
  const appliedSearchText = searchParams.get('search') || "";
  const appliedPopularityRange: [number, number] = searchParams.get('popularity')
    ? searchParams.get('popularity')!.split('-').map(Number) as [number, number]
    : [0, 1000];
  const appliedSortBy = searchParams.get('sortBy') || "random";
  const appliedSortOrder = searchParams.get('sortOrder') || "desc";

  // Write to URL params
  const setAppliedGenres = (genres: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    if (genres.length > 0) {
      newParams.set('genres', genres.join(','));
    } else {
      newParams.delete('genres');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedRatingRange = (range: [number, number]) => {
    const newParams = new URLSearchParams(searchParams);
    if (range[0] !== 0 || range[1] !== 10) {
      newParams.set('rating', `${range[0]}-${range[1]}`);
    } else {
      newParams.delete('rating');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedYearRange = (range: [number, number]) => {
    const newParams = new URLSearchParams(searchParams);
    if (range[0] !== 1900 || range[1] !== 2030) {
      newParams.set('year', `${range[0]}-${range[1]}`);
    } else {
      newParams.delete('year');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedSearchText = (text: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (text) {
      newParams.set('search', text);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedPopularityRange = (range: [number, number]) => {
    const newParams = new URLSearchParams(searchParams);
    if (range[0] !== 0 || range[1] !== 1000) {
      newParams.set('popularity', `${range[0]}-${range[1]}`);
    } else {
      newParams.delete('popularity');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedSortBy = (sortBy: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortBy && sortBy !== "random") {
      newParams.set('sortBy', sortBy);
    } else {
      newParams.delete('sortBy');
    }
    setSearchParams(newParams, { replace: true });
  };

  const setAppliedSortOrder = (sortOrder: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortOrder && sortOrder !== "desc") {
      newParams.set('sortOrder', sortOrder);
    } else {
      newParams.delete('sortOrder');
    }
    setSearchParams(newParams, { replace: true });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <FilterContext.Provider
      value={{
        appliedGenres,
        setAppliedGenres,
        appliedRatingRange,
        setAppliedRatingRange,
        appliedYearRange,
        setAppliedYearRange,
        appliedSearchText,
        setAppliedSearchText,
        appliedPopularityRange,
        setAppliedPopularityRange,
        appliedSortBy,
        setAppliedSortBy,
        appliedSortOrder,
        setAppliedSortOrder,
        resetFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};
