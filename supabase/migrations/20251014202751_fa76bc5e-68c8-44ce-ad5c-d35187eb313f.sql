-- Unschedule the broken cron jobs
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');

-- Recreate Daily Refresh Pipeline (01:00 UTC daily)
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  );
  $$
);

-- Recreate New Imports Pipeline (02:00 UTC daily)
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.K0ZgGKMr6U1PcYWYp3-aT-D6nPUyOg3e40r_Gs8w8AM"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  );
  $$
);