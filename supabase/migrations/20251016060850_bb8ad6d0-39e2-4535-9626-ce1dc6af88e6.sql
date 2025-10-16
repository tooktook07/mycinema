-- Enable required extensions for automation
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Note: cron.schedule will replace existing jobs with the same name

-- Job 1: Reset sync tracker cycle (00:00 UTC daily)
SELECT cron.schedule(
  'sync-tracker-reset',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/cancel-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.P6vF8VFqLw6vLk0TQ-TU_qQqXGvGZzKxVvqPqXLqXqU"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: Daily refresh pipeline (01:00 UTC daily) - refreshes existing movies
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.P6vF8VFqLw6vLk0TQ-TU_qQqXGvGZzKxVvqPqXLqXqU"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 3: Import new movies (02:00 UTC daily) - imports movies from last 60 days
SELECT cron.schedule(
  'new-movies-import',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.P6vF8VFqLw6vLk0TQ-TU_qQqXGvGZzKxVvqPqXLqXqU"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 4: Enrich with OMDb (03:00 UTC daily) - enriches movies missing OMDb data
SELECT cron.schedule(
  'enrich-with-omdb',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.P6vF8VFqLw6vLk0TQ-TU_qQqXGvGZzKxVvqPqXLqXqU"}'::jsonb,
    body := '{"trigger_source": "automated", "batchSize": 50}'::jsonb
  ) AS request_id;
  $$
);

-- Job 5: Store posters (03:30 UTC daily) - downloads missing posters
SELECT cron.schedule(
  'store-posters',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNTE5NywiZXhwIjoyMDc1MTgxMTk3fQ.P6vF8VFqLw6vLk0TQ-TU_qQqXGvGZzKxVvqPqXLqXqU"}'::jsonb,
    body := '{"trigger_source": "automated", "limit": 100}'::jsonb
  ) AS request_id;
  $$
);