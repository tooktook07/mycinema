-- Remove unused columns from user_ratings table
ALTER TABLE user_ratings 
DROP COLUMN IF EXISTS tv_show_id,
DROP COLUMN IF EXISTS watched,
DROP COLUMN IF EXISTS watched_at;