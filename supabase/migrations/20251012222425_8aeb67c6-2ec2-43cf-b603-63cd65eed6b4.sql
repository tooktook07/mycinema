-- Create GIN indexes for faster array searches on genres and keywords
CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON public.movies USING GIN (keywords);

-- Add index on imdb_rating for better sorting performance
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating ON public.movies (imdb_rating DESC NULLS LAST);

-- Add composite index for year-based queries
CREATE INDEX IF NOT EXISTS idx_movies_year_rating ON public.movies (year DESC, imdb_rating DESC NULLS LAST);