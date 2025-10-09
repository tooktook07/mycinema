-- Add trigger_source column to sync_history table to track manual vs automated syncs
ALTER TABLE public.sync_history 
ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'manual';

-- Add a check constraint to enforce valid values
DO $$ BEGIN
  ALTER TABLE public.sync_history 
  ADD CONSTRAINT sync_history_trigger_source_check 
  CHECK (trigger_source IN ('manual', 'automated'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add index for better query performance on trigger_source
CREATE INDEX IF NOT EXISTS idx_sync_history_trigger_source 
ON public.sync_history(trigger_source);

-- Update all 6 cron jobs to include trigger_source parameter
-- These will replace existing jobs with the same name

-- Job 1: Import new movies (2025)
SELECT cron.schedule(
  'import-new-movies-2025',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-tmdb-movies',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"minRating": 6, "maxRating": 10, "yearRange": [2025, 2025], "statuses": ["Released"], "minVoteCount": 1000, "syncMode": true, "trigger_source": "automated"}'::jsonb
  );
  $$
);

-- Job 2: Import old movies from cycle tracker
SELECT cron.schedule(
  'import-old-movies',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-tmdb-movies',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := jsonb_build_object(
      'minRating', 6,
      'maxRating', 10,
      'yearRange', jsonb_build_array(2025 - get_current_sync_day(), 2025 - get_current_sync_day()),
      'statuses', jsonb_build_array('Released'),
      'minVoteCount', 1000,
      'syncMode', true,
      'trigger_source', 'automated'
    )
  );
  $$
);

-- Job 3: OMDb enrichment (daily)
SELECT cron.schedule(
  'omdb-enrichment',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"batchSize": 100, "forceRefresh": false, "trigger_source": "automated"}'::jsonb
  );
  $$
);

-- Job 4: OMDb re-enrichment (weekly)
SELECT cron.schedule(
  'omdb-refresh',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"batchSize": 100, "forceRefresh": true, "trigger_source": "automated"}'::jsonb
  );
  $$
);

-- Job 5: Poster storage (daily)
SELECT cron.schedule(
  'store-posters',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"batchSize": 100, "trigger_source": "automated"}'::jsonb
  );
  $$
);

-- Job 6: Movie sync tracker cycle management (daily at midnight)
SELECT cron.schedule(
  'update-sync-tracker',
  '0 0 * * *',
  $$
  UPDATE movie_sync_tracker 
  SET cycle_day = CASE 
    WHEN cycle_day >= 30 THEN 1 
    ELSE cycle_day + 1 
  END,
  movies_processed = 0,
  last_processed_at = NOW();
  $$
);