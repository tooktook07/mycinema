export interface SEOProps {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'video.movie' | 'article' | 'profile';
  url?: string;
  noindex?: boolean;
  canonical?: string;
  schema?: Record<string, any>;
}

export interface MovieSEOData {
  title: string;
  year: number;
  plot?: string;
  poster?: string;
  genres?: string[];
  director?: string;
  actors?: string;
  imdbRating?: number;
  imdbVotes?: number;
  rating?: number;
  voteCount?: number;
  runtime?: string;
  releaseDate?: string;
  imdbId?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
