-- Remove all existing cron jobs
SELECT cron.unschedule('sync-tracker-reset');
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.unschedule('enrich-with-omdb');
SELECT cron.unschedule('store-posters');

-- Create a secure function to retrieve service role key from vault
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Retrieve from vault (will be set manually after migration)
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
  
  RETURN service_key;
END;
$$;

-- Recreate cron jobs using vault-based service role key
-- Job 1: Reset sync tracker at midnight
SELECT cron.schedule(
  'sync-tracker-reset',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/cancel-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_service_role_key()
    ),
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: Daily refresh at 01:00
SELECT cron.schedule(
  'daily-refresh-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_service_role_key()
    ),
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 3: Import new movies at 02:00
SELECT cron.schedule(
  'import-new-movies-pipeline',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_service_role_key()
    ),
    body := '{"trigger_source": "automated"}'::jsonb
  ) AS request_id;
  $$
);

-- Job 4: Enrich with OMDb at 03:00
SELECT cron.schedule(
  'enrich-with-omdb',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/enrich-with-omdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_service_role_key()
    ),
    body := '{"trigger_source": "automated", "batchSize": 50}'::jsonb
  ) AS request_id;
  $$
);

-- Job 5: Store posters at 03:30 on the 1st of each month
SELECT cron.schedule(
  'store-posters',
  '30 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/store-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_service_role_key()
    ),
    body := '{"trigger_source": "automated", "limit": 100}'::jsonb
  ) AS request_id;
  $$
);