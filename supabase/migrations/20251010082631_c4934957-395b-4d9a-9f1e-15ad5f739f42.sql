-- Clean up old deprecated cron jobs
SELECT cron.unschedule(1); -- import-new-movies-2025
SELECT cron.unschedule(2); -- enrich-new-movies
SELECT cron.unschedule(3); -- store-new-posters
SELECT cron.unschedule(4); -- resync-old-movies
SELECT cron.unschedule(5); -- reenrich-old-movies
SELECT cron.unschedule(6); -- store-missing-posters
SELECT cron.unschedule(9); -- import-old-movies

-- Create new unified pipeline cron jobs
-- Daily Refresh Pipeline: Runs at 2:00 AM daily to refresh existing movies
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUxOTcsImV4cCI6MjA3NTE4MTE5N30.Hpl1Dw7cbUxVNORBv_JBL9eoEnqVTAjfZD_rpW8lueg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Import New Movies Pipeline: Runs at 3:30 AM daily to import new releases
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUxOTcsImV4cCI6MjA3NTE4MTE5N30.Hpl1Dw7cbUxVNORBv_JBL9eoEnqVTAjfZD_rpW8lueg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);