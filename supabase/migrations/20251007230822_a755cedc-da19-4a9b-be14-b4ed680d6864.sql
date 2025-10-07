-- Add OMDb enrichment columns to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_rating numeric;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_votes integer;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS metascore integer;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS awards text;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_sources jsonb DEFAULT '{"tmdb": true, "omdb": false}'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_omdb_fetch timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_imdb_rating ON movies(imdb_rating) WHERE imdb_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movies_data_sources ON movies USING GIN(data_sources);
CREATE INDEX IF NOT EXISTS idx_movies_last_omdb_fetch ON movies(last_omdb_fetch) WHERE last_omdb_fetch IS NOT NULL;

-- Create OMDb API usage tracking table
CREATE TABLE IF NOT EXISTS omdb_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  requests_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS omdb_usage_date_idx ON omdb_api_usage(date);

-- Enable RLS on omdb_api_usage
ALTER TABLE omdb_api_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage API usage
CREATE POLICY "Admins can view API usage" ON omdb_api_usage
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert API usage" ON omdb_api_usage
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update API usage" ON omdb_api_usage
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));