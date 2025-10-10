-- Clean up low-quality movies imported by the new pipeline
-- Remove movies that don't meet quality thresholds:
-- Rating must be >= 6.0 (from either IMDB or TMDB)
-- Vote count must be >= 1000 (from either IMDB or TMDB)

DELETE FROM movies 
WHERE year = 2025 
AND created_at > '2025-01-09'
AND (
  -- Neither source has rating >= 6.0
  (COALESCE(imdb_rating, 0) < 6.0 AND COALESCE(rating, 0) < 6.0)
  OR 
  -- Neither source has votes >= 1000
  (COALESCE(imdb_votes, 0) < 1000 AND COALESCE(vote_count, 0) < 1000)
);