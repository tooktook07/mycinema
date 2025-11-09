-- Fix cron jobs by hardcoding CRON_SECRET value
-- IMPORTANT: Replace 'YOUR_CRON_SECRET_HERE' with your actual CRON_SECRET value before confirming

-- Unschedule existing jobs
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.unschedule('enrich-with-omdb');
SELECT cron.unschedule('store-posters');

-- Recreate import-new-movies-pipeline with secret
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate daily-refresh-pipeline with secret
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate enrich-with-omdb with secret
SELECT cron.schedule(
  'enrich-with-omdb',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate store-posters with secret
SELECT cron.schedule(
  'store-posters',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);