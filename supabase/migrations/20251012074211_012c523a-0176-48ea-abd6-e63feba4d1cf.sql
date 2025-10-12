-- Fix automated cron jobs to use SERVICE_ROLE key and fix sync tracker query

-- Fix Job 1: Daily Refresh Pipeline - Use SERVICE_ROLE key
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix Job 2: Import New Movies Pipeline - Use SERVICE_ROLE key
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix Job 3: Sync Tracker Update - Add WHERE clause to prevent duplicate key errors
SELECT cron.unschedule('update-sync-tracker');
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
  last_processed_at = NOW()
  WHERE id = (SELECT id FROM movie_sync_tracker ORDER BY created_at DESC LIMIT 1);
  $$
);