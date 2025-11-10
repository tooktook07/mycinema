-- Update cron jobs to use CRON_SECRET authentication
-- Replace placeholder with actual secret: ts~Rp8FRUr8KtEH

-- Update import-new-movies-pipeline cron job (ID: 59)
SELECT cron.alter_job(
  job_id := 59,
  schedule := '0 2 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'ts~Rp8FRUr8KtEH'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update daily-refresh-pipeline cron job (ID: 60)
SELECT cron.alter_job(
  job_id := 60,
  schedule := '0 3 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'ts~Rp8FRUr8KtEH'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update enrich-with-omdb cron job (ID: 61)
SELECT cron.alter_job(
  job_id := 61,
  schedule := '0 4 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'ts~Rp8FRUr8KtEH'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);

-- Update store-posters cron job (ID: 62)
SELECT cron.alter_job(
  job_id := 62,
  schedule := '0 5 * * *',
  command := $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'ts~Rp8FRUr8KtEH'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);