-- Add new fields to movies table
ALTER TABLE public.movies 
ADD COLUMN IF NOT EXISTS vote_count integer,
ADD COLUMN IF NOT EXISTS popularity numeric,
ADD COLUMN IF NOT EXISTS original_language text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS status text;