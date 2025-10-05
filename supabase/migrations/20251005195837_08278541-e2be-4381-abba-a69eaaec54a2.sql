-- Add new columns to movies table for additional movie data
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS writing text,
ADD COLUMN IF NOT EXISTS sound text,
ADD COLUMN IF NOT EXISTS keywords text[];