import poster3 from "@/assets/poster3.jpg";
import poster5 from "@/assets/poster5.jpg";
import { TvShow } from "./types";

export const mockTvShows: TvShow[] = [
  {
    id: 1,
    title: "Neon Futures",
    rating: 9.2,
    startYear: 2024,
    endYear: null,
    genre: ["Sci-Fi", "Thriller"],
    poster: poster3,
    imdbId: "tt2575988",
    seasons: 2,
    episodes: 20,
    seasonDates: [
      { season: 1, year: 2024 },
      { season: 2, year: 2025 },
    ],
  },
  {
    id: 2,
    title: "Kingdom of Dragons",
    rating: 8.7,
    startYear: 2023,
    endYear: null,
    genre: ["Fantasy", "Action"],
    poster: poster5,
    imdbId: "tt0944947",
    seasons: 3,
    episodes: 30,
    seasonDates: [
      { season: 1, year: 2023 },
      { season: 2, year: 2024 },
      { season: 3, year: 2025 },
    ],
  },
  {
    id: 3,
    title: "Mystic Legends",
    rating: 8.3,
    startYear: 2022,
    endYear: 2024,
    genre: ["Fantasy", "Drama"],
    poster: poster5,
    imdbId: "tt5753856",
    seasons: 2,
    episodes: 16,
    seasonDates: [
      { season: 1, year: 2022 },
      { season: 2, year: 2024 },
    ],
  },
  {
    id: 4,
    title: "Galaxy Wars",
    rating: 8.5,
    startYear: 2020,
    endYear: 2023,
    genre: ["Sci-Fi", "Action"],
    poster: poster3,
    imdbId: "tt0458339",
    seasons: 4,
    episodes: 48,
    seasonDates: [
      { season: 1, year: 2020 },
      { season: 2, year: 2021 },
      { season: 3, year: 2022 },
      { season: 4, year: 2023 },
    ],
  },
];
