-- Update user_ratings table to support sentiment-based ratings stored as numbers
-- This allows easy conversion to 1-10 scale in the future
-- Sentiment mapping: 1 = not interested, 5 = like, 10 = love

-- Add sentiment_rating column to store numeric values
ALTER TABLE public.user_ratings 
ADD COLUMN IF NOT EXISTS sentiment_rating integer;

-- Add check constraint to ensure only valid sentiment values
ALTER TABLE public.user_ratings
ADD CONSTRAINT valid_sentiment_rating 
CHECK (sentiment_rating IN (1, 5, 10) OR sentiment_rating IS NULL);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_ratings_sentiment_rating 
ON public.user_ratings(sentiment_rating);

-- Add comment to document the mapping
COMMENT ON COLUMN public.user_ratings.sentiment_rating IS 'Sentiment-based rating: 1 = not interested, 5 = like, 10 = love. Can be converted to 1-10 scale in future.';