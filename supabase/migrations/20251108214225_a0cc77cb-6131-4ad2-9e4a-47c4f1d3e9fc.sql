-- Update cron jobs to use webhook secrets for all functions

-- Unschedule all existing cron jobs (in case they exist)
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.unschedule('enrich-with-omdb');
SELECT cron.unschedule('store-posters');

-- Recreate all cron jobs with webhook secret authentication
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'enrich-with-omdb',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('trigger_source', 'automated')
  );
  $$
);

SELECT cron.schedule(
  'store-posters',
  '30 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('trigger_source', 'automated')
  );
  $$
);