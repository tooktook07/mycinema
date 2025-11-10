-- Update cron jobs to use actual CRON_SECRET from environment
-- The CRON_SECRET is now stored in Supabase secrets and available to edge functions

-- Update import-new-movies-pipeline cron job
SELECT cron.alter_job(
  job_id := 59,
  schedule := '0 2 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update daily-refresh-pipeline cron job
SELECT cron.alter_job(
  job_id := 60,
  schedule := '0 3 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update enrich-with-omdb cron job
SELECT cron.alter_job(
  job_id := 61,
  schedule := '0 4 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update store-posters cron job
SELECT cron.alter_job(
  job_id := 62,
  schedule := '0 5 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);