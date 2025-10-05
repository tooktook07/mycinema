import poster1 from "@/assets/poster1.jpg";
import poster2 from "@/assets/poster2.jpg";
import poster4 from "@/assets/poster4.jpg";
import poster6 from "@/assets/poster6.jpg";
import { Movie } from "./types";

export const mockMovies: Movie[] = [
  {
    id: 1,
    title: "The Dark Shadows",
    rating: 8.9,
    year: 2023,
    genre: ["Action", "Thriller"],
    poster: poster1,
    imdbId: "tt1375666",
  },
  {
    id: 2,
    title: "Love in Paris",
    rating: 7.6,
    year: 2022,
    genre: ["Romance", "Comedy"],
    poster: poster2,
    imdbId: "tt2582802",
  },
  {
    id: 3,
    title: "The Haunting",
    rating: 8.1,
    year: 2021,
    genre: ["Horror", "Thriller"],
    poster: poster4,
    imdbId: "tt1457767",
  },
  {
    id: 4,
    title: "Silent Voices",
    rating: 9.0,
    year: 2022,
    genre: ["Drama"],
    poster: poster6,
    imdbId: "tt0111161",
  },
  {
    id: 5,
    title: "Midnight Runner",
    rating: 7.8,
    year: 2020,
    genre: ["Action", "Drama"],
    poster: poster1,
    imdbId: "tt0468569",
  },
  {
    id: 6,
    title: "Summer Dreams",
    rating: 7.2,
    year: 2021,
    genre: ["Romance", "Drama"],
    poster: poster2,
    imdbId: "tt0816692",
  },
  {
    id: 7,
    title: "Dark Waters",
    rating: 7.9,
    year: 2019,
    genre: ["Horror", "Thriller"],
    poster: poster4,
    imdbId: "tt1392190",
  },
  {
    id: 8,
    title: "The Last Stand",
    rating: 8.8,
    year: 2024,
    genre: ["Action", "Drama"],
    poster: poster6,
    imdbId: "tt4154756",
  },
];
