-- Remove movies with less than 100 votes or status not 'Released'
DELETE FROM public.movies
WHERE (vote_count IS NULL OR vote_count < 100)
   OR (status IS NULL OR status != 'Released');