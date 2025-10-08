-- Delete movies with effective rating below 6
DELETE FROM movies
WHERE COALESCE(imdb_rating, rating) < 6;