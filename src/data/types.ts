export interface Movie {
  id: number;
  title: string;
  rating: number;
  year: number;
  genre: string[];
  poster: string;
  imdbId: string;
}

export interface TvShow {
  id: number;
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
