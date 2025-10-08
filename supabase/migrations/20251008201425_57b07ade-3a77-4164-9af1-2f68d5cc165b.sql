-- Delete movies with effective rating below 5
DELETE FROM movies
WHERE COALESCE(imdb_rating, rating) < 5;