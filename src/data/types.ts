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
