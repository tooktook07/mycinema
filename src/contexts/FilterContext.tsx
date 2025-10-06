import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  appliedGenres: string[];
  setAppliedGenres: (genres: string[]) => void;
  appliedRatingRange: [number, number];
  setAppliedRatingRange: (range: [number, number]) => void;
  appliedYearRange: [number, number];
  setAppliedYearRange: (range: [number, number]) => void;
  appliedLanguages: string[];
  setAppliedLanguages: (languages: string[]) => void;
  appliedSearchText: string;
  setAppliedSearchText: (text: string) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [appliedGenres, setAppliedGenres] = useState<string[]>([]);
  const [appliedRatingRange, setAppliedRatingRange] = useState<[number, number]>([0, 10]);
  const [appliedYearRange, setAppliedYearRange] = useState<[number, number]>([1900, 2030]);
  const [appliedLanguages, setAppliedLanguages] = useState<string[]>([]);
  const [appliedSearchText, setAppliedSearchText] = useState<string>("");

  const resetFilters = () => {
    setAppliedGenres([]);
    setAppliedRatingRange([0, 10]);
    setAppliedYearRange([1900, 2030]);
    setAppliedLanguages([]);
    setAppliedSearchText("");
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
        appliedLanguages,
        setAppliedLanguages,
        appliedSearchText,
        setAppliedSearchText,
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
