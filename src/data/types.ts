export interface Movie {
  id: string;
  title: string;
  rating: number;
  year: number;
  genre: string[];
  poster: string;
  imdbId: string;
  plot?: string;
  director?: string;
  actors?: string;
  runtime?: string;
  voteCount?: number;
}

export interface TvShow {
  id: string;
  title: string;
  rating: number;
  startYear: number;
  endYear: number | null;
  genre: string[];
  poster: string;
  imdbId: string;
  seasons: number;
  episodes: number;
  seasonDates: { season: number; year: number }[];
}
