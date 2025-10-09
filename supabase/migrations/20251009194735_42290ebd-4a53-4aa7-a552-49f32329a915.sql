-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create movie sync tracker table for 30-day rotation cycle
CREATE TABLE IF NOT EXISTS public.movie_sync_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_day INTEGER NOT NULL UNIQUE CHECK (cycle_day BETWEEN 1 AND 30),
  last_processed_at TIMESTAMP WITH TIME ZONE,
  movies_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on movie_sync_tracker
ALTER TABLE public.movie_sync_tracker ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admins to view sync tracker
CREATE POLICY "Admins can view sync tracker"
ON public.movie_sync_tracker
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policy for admins to update sync tracker
CREATE POLICY "Admins can update sync tracker"
ON public.movie_sync_tracker
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial 30-day cycle records
INSERT INTO public.movie_sync_tracker (cycle_day)
SELECT generate_series(1, 30)
ON CONFLICT (cycle_day) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_movie_sync_tracker_cycle_day 
ON public.movie_sync_tracker(cycle_day);

-- Create function to get current sync day (1-30 based on day of month)
CREATE OR REPLACE FUNCTION public.get_current_sync_day()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE 
    WHEN EXTRACT(DAY FROM NOW())::INTEGER <= 30 
    THEN EXTRACT(DAY FROM NOW())::INTEGER
    ELSE 30
  END;
$$;

-- Create monitoring view for automation health
CREATE OR REPLACE VIEW public.automation_health AS
SELECT 
  sync_type,
  DATE(created_at) as sync_date,
  COUNT(*) as runs,
  SUM(imported) as total_imported,
  SUM(updated) as total_updated,
  SUM(failed) as total_failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))) as avg_duration_seconds
FROM sync_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY sync_type, DATE(created_at)
ORDER BY sync_date DESC, sync_type;

-- Grant access to automation_health view for admins
GRANT SELECT ON public.automation_health TO authenticated;

-- ========================================
-- CRON JOB SCHEDULES
-- ========================================

-- NEW MOVIES PIPELINE (2025)
-- ========================================

-- 1. Import new 2025 movies daily at 2:00 AM UTC
SELECT cron.schedule(
  'import-new-movies-2025',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-tmdb-movies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'minRating', 6,
      'minVoteCount', 1000,
      'yearRange', jsonb_build_array(2025, 2025),
      'statuses', jsonb_build_array('Released'),
      'syncMode', false,
      'maxPages', 5
    )
  ) as request_id;
  $$
);

-- 2. Enrich new movies at 2:15 AM UTC
SELECT cron.schedule(
  'enrich-new-movies',
  '15 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'batchSize', 100,
      'forceRefresh', false
    )
  ) as request_id;
  $$
);

-- 3. Download new movie posters at 2:30 AM UTC
SELECT cron.schedule(
  'store-new-posters',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'limit', 100,
      'offset', 0
    )
  ) as request_id;
  $$
);

-- OLD MOVIES MAINTENANCE (30-day rotation)
-- ========================================

-- 4. Re-sync old movies at 3:00 AM UTC
SELECT cron.schedule(
  'resync-old-movies',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-tmdb-movies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'minRating', 6,
      'minVoteCount', 1000,
      'yearRange', jsonb_build_array(2000, 2024),
      'statuses', jsonb_build_array('Released'),
      'syncMode', true,
      'maxPages', 50
    )
  ) as request_id;
  $$
);

-- 5. Re-enrich old movies at 3:30 AM UTC
SELECT cron.schedule(
  'reenrich-old-movies',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'batchSize', 200,
      'forceRefresh', true
    )
  ) as request_id;
  $$
);

-- 6. Download missing posters at 4:00 AM UTC
SELECT cron.schedule(
  'store-missing-posters',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'limit', 200,
      'offset', 0
    )
  ) as request_id;
  $$
);