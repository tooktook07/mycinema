-- Create tracking table for TMDB processed movies
CREATE TABLE IF NOT EXISTS public.tmdb_processed_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER UNIQUE NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  import_status TEXT NOT NULL, -- 'imported', 'skipped_no_imdb', 'skipped_quality', 'skipped_duplicate'
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tmdb_processed_movies_tmdb_id ON public.tmdb_processed_movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_tmdb_processed_movies_checked_at ON public.tmdb_processed_movies(checked_at);

-- Enable RLS
ALTER TABLE public.tmdb_processed_movies ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage tracking data
CREATE POLICY "Admins can view processed movies" ON public.tmdb_processed_movies
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert processed movies" ON public.tmdb_processed_movies
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update processed movies" ON public.tmdb_processed_movies
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));