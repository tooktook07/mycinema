-- Update cron jobs with actual CRON_SECRET
-- IMPORTANT: Replace 'PASTE_YOUR_ACTUAL_CRON_SECRET_HERE' with your real CRON_SECRET value
-- You can find it in: Backend → Secrets → CRON_SECRET

-- Unschedule existing jobs
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.unschedule('enrich-with-omdb');
SELECT cron.unschedule('store-posters');

-- Recreate import-new-movies-pipeline with actual secret
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'PASTE_YOUR_ACTUAL_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate daily-refresh-pipeline with actual secret
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'PASTE_YOUR_ACTUAL_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate enrich-with-omdb with actual secret
SELECT cron.schedule(
  'enrich-with-omdb',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'PASTE_YOUR_ACTUAL_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Recreate store-posters with actual secret
SELECT cron.schedule(
  'store-posters',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'PASTE_YOUR_ACTUAL_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $$
);