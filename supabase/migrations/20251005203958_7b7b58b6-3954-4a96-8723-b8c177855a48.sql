-- Rename user_movie_data to user_ratings and make it work for both movies and TV shows
ALTER TABLE public.user_movie_data RENAME TO user_ratings;

-- Add a type column to distinguish between movies and TV shows
ALTER TABLE public.user_ratings 
ADD COLUMN media_type text NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv_show'));

-- Rename movie_id to media_id for clarity
ALTER TABLE public.user_ratings RENAME COLUMN movie_id TO media_id;

-- Update the unique constraint
ALTER TABLE public.user_ratings 
DROP CONSTRAINT IF EXISTS user_movie_data_user_id_movie_id_key;

ALTER TABLE public.user_ratings 
ADD CONSTRAINT user_ratings_user_media_unique UNIQUE (user_id, media_id, media_type);

-- Update RLS policies with new table name
DROP POLICY IF EXISTS "Users can delete their own movie data" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can insert their own movie data" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can update their own movie data" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can view their own movie data" ON public.user_ratings;

CREATE POLICY "Users can delete their own ratings"
  ON public.user_ratings
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
  ON public.user_ratings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.user_ratings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings"
  ON public.user_ratings
  FOR SELECT
  USING (auth.uid() = user_id);