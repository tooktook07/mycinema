-- Function to get genre statistics with counts
CREATE OR REPLACE FUNCTION public.get_genre_stats()
RETURNS TABLE(genre text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    unnest(genres) as genre,
    COUNT(*) as count
  FROM public.movies
  WHERE genres IS NOT NULL AND array_length(genres, 1) > 0
  GROUP BY unnest(genres)
  ORDER BY count DESC;
$function$;

-- Function to get decade statistics with counts
CREATE OR REPLACE FUNCTION public.get_decade_stats()
RETURNS TABLE(decade integer, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    (FLOOR(year / 10) * 10)::integer as decade,
    COUNT(*) as count
  FROM public.movies
  WHERE year IS NOT NULL
  GROUP BY FLOOR(year / 10) * 10
  ORDER BY decade DESC;
$function$;