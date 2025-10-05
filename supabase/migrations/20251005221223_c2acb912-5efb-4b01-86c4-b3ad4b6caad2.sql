-- Copy sentiment_rating data to user_rating column
UPDATE user_ratings 
SET user_rating = sentiment_rating 
WHERE sentiment_rating IS NOT NULL;

-- Drop the sentiment_rating column
ALTER TABLE user_ratings 
DROP COLUMN sentiment_rating;