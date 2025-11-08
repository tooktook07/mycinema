export interface VoteTierConfig {
  currentYear: number;      // 300
  lastYear: number;         // 500
  twoToThreeYears: number;  // 750
  older: number;            // 1000
}

export function getRequiredVoteCount(
  movieYear: number, 
  tiers: VoteTierConfig
): number {
  const currentYear = new Date().getFullYear();
  const yearsDiff = currentYear - movieYear;
  
  if (yearsDiff === 0) return tiers.currentYear;      // 2025
  if (yearsDiff === 1) return tiers.lastYear;         // 2024
  if (yearsDiff >= 2 && yearsDiff <= 3) return tiers.twoToThreeYears;  // 2022-2023
  return tiers.older;  // 2021 and earlier
}

export function getYearLabel(movieYear: number): string {
  const currentYear = new Date().getFullYear();
  const diff = currentYear - movieYear;
  if (diff === 0) return 'current year';
  if (diff === 1) return 'last year';
  if (diff >= 2 && diff <= 3) return '2-3 years';
  return 'older';
}

export interface Movie {
  id: string;
  title: string;
  rating: number;
  year: number;
  genre: string[];
  poster: string;
  local_poster_url?: string | null;
  imdbId: string;
  plot?: string;
  director?: string;
  actors?: string;
  runtime?: string;
  voteCount?: number;
  originalLanguage?: string;
  writing?: string;
  sound?: string;
  keywords?: string[];
  productionCompanies?: any;
  productionCountries?: any;
  spokenLanguages?: any;
  budget?: number;
  revenue?: number;
  watchProviders?: any;
  translations?: any;
  // OMDb enrichment fields
  imdbRating?: number;
  imdbVotes?: number;
  metascore?: number;
  boxOffice?: string;
  awards?: string;
  dataSources?: { tmdb: boolean; omdb: boolean };
  lastOmdbFetch?: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}
