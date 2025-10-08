-- Fix security warnings from previous migration

-- Fix: Set search_path for get_effective_rating function
DROP FUNCTION IF EXISTS get_effective_rating(movies);

CREATE OR REPLACE FUNCTION get_effective_rating(movie movies)
RETURNS numeric 
LANGUAGE SQL 
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(movie.imdb_rating, movie.rating);
$$;

-- Move pg_trgm extension to extensions schema (best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;