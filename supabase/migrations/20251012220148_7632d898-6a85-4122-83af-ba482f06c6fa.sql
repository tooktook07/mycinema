-- Phase 1: Add critical indexes for performance optimization

-- 1. Index on created_at for efficient ordering and pagination
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON public.movies (created_at DESC NULLS LAST);

-- 2. Composite index for year-based queries with sorting
CREATE INDEX IF NOT EXISTS idx_movies_year_created_at ON public.movies (year DESC, created_at DESC) WHERE year IS NOT NULL;

-- 3. Composite index for rating-based queries with sorting
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating_created_at ON public.movies (imdb_rating DESC NULLS LAST, created_at DESC) WHERE imdb_rating IS NOT NULL;

-- 4. GIN index for efficient genre array searches
CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING GIN (genres) WHERE genres IS NOT NULL;

-- 5. GIN index for efficient keyword array searches
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON public.movies USING GIN (keywords) WHERE keywords IS NOT NULL;

-- 6. Text search indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON public.movies USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_director_trgm ON public.movies USING gin (director gin_trgm_ops) WHERE director IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_actors_trgm ON public.movies USING gin (actors gin_trgm_ops) WHERE actors IS NOT NULL;