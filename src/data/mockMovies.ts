import poster1 from "@/assets/poster1.jpg";
import poster2 from "@/assets/poster2.jpg";
import poster3 from "@/assets/poster3.jpg";
import poster4 from "@/assets/poster4.jpg";
import poster5 from "@/assets/poster5.jpg";
import poster6 from "@/assets/poster6.jpg";

export interface Movie {
  id: number;
  title: string;
  rating: number;
  year: number;
  genre: string[];
  poster: string;
  type: "movie" | "series";
}

export const mockMovies: Movie[] = [
  {
    id: 1,
    title: "The Dark Shadows",
    rating: 8.9,
    year: 2023,
    genre: ["Action", "Thriller"],
    poster: poster1,
    type: "movie",
  },
  {
    id: 2,
    title: "Love in Paris",
    rating: 7.6,
    year: 2022,
    genre: ["Romance", "Comedy"],
    poster: poster2,
    type: "movie",
  },
  {
    id: 3,
    title: "Neon Futures",
    rating: 9.2,
    year: 2024,
    genre: ["Sci-Fi", "Thriller"],
    poster: poster3,
    type: "series",
  },
  {
    id: 4,
    title: "The Haunting",
    rating: 8.1,
    year: 2021,
    genre: ["Horror", "Thriller"],
    poster: poster4,
    type: "movie",
  },
  {
    id: 5,
    title: "Kingdom of Dragons",
    rating: 8.7,
    year: 2023,
    genre: ["Fantasy", "Action"],
    poster: poster5,
    type: "series",
  },
  {
    id: 6,
    title: "Silent Voices",
    rating: 9.0,
    year: 2022,
    genre: ["Drama"],
    poster: poster6,
    type: "movie",
  },
  {
    id: 7,
    title: "Midnight Runner",
    rating: 7.8,
    year: 2020,
    genre: ["Action", "Drama"],
    poster: poster1,
    type: "movie",
  },
  {
    id: 8,
    title: "Summer Dreams",
    rating: 7.2,
    year: 2021,
    genre: ["Romance", "Drama"],
    poster: poster2,
    type: "movie",
  },
  {
    id: 9,
    title: "Galaxy Wars",
    rating: 8.5,
    year: 2023,
    genre: ["Sci-Fi", "Action"],
    poster: poster3,
    type: "series",
  },
  {
    id: 10,
    title: "Dark Waters",
    rating: 7.9,
    year: 2019,
    genre: ["Horror", "Thriller"],
    poster: poster4,
    type: "movie",
  },
  {
    id: 11,
    title: "Mystic Legends",
    rating: 8.3,
    year: 2022,
    genre: ["Fantasy", "Drama"],
    poster: poster5,
    type: "series",
  },
  {
    id: 12,
    title: "The Last Stand",
    rating: 8.8,
    year: 2024,
    genre: ["Action", "Drama"],
    poster: poster6,
    type: "movie",
  },
];
