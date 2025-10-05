-- Add new columns to movies table for extended TMDB data
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS production_companies jsonb,
ADD COLUMN IF NOT EXISTS production_countries jsonb,
ADD COLUMN IF NOT EXISTS spoken_languages jsonb,
ADD COLUMN IF NOT EXISTS budget bigint,
ADD COLUMN IF NOT EXISTS revenue bigint,
ADD COLUMN IF NOT EXISTS watch_providers jsonb,
ADD COLUMN IF NOT EXISTS translations jsonb;