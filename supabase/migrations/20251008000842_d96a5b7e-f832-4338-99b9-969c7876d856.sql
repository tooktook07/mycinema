-- Phase 1: Database Performance Optimization

-- Create helper function for effective rating (IMDB preferred, fallback to TMDB)
CREATE OR REPLACE FUNCTION get_effective_rating(movie movies)
RETURNS numeric AS $$
  SELECT COALESCE(movie.imdb_rating, movie.rating);
$$ LANGUAGE SQL IMMUTABLE;

-- Create index on effective rating using expression
CREATE INDEX IF NOT EXISTS idx_movies_effective_rating ON movies ((COALESCE(imdb_rating, rating)));

-- Create index on TMDB rating
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating);

-- Create index on IMDB rating
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating ON movies(imdb_rating);

-- Create index on year for year range filters
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);

-- Create index on language for language filters
CREATE INDEX IF NOT EXISTS idx_movies_language ON movies(original_language);

-- Create GIN indexes for array columns (genres, keywords)
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON movies USING GIN(keywords);

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_actors_trgm ON movies USING GIN(actors gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_director_trgm ON movies USING GIN(director gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_writing_trgm ON movies USING GIN(writing gin_trgm_ops);

-- Create composite index for common sorting patterns
CREATE INDEX IF NOT EXISTS idx_movies_rating_year ON movies(rating DESC, year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating_year ON movies(imdb_rating DESC NULLS LAST, year DESC);