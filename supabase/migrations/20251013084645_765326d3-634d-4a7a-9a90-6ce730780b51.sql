-- Update cron job schedules to reduce gap between pipelines
-- Sync Tracker: 00:00 UTC (already correct)
-- Daily Refresh: 01:00 UTC (1 AM)
-- New Imports: 02:00 UTC (2 AM)

-- Unschedule old cron jobs
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('new-movies-import-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');

-- Schedule Daily Refresh Pipeline at 01:00 UTC (1 AM)
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'trigger_source', 'automated',
      'timestamp', NOW()
    )
  );
  $$
);

-- Schedule New Movies Import Pipeline at 02:00 UTC (2 AM)
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'trigger_source', 'automated',
      'timestamp', NOW()
    )
  );
  $$
);