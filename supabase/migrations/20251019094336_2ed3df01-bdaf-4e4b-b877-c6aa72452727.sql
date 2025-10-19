-- NUCLEAR RESET: Remove all traces of old cron jobs with hardcoded tokens
SELECT cron.unschedule('sync-tracker-reset');
SELECT cron.unschedule('daily-refresh-pipeline');
SELECT cron.unschedule('import-new-movies-pipeline');
SELECT cron.unschedule('enrich-with-omdb');
SELECT cron.unschedule('store-posters');

-- Job 1: Reset sync tracker cycle (00:00 UTC daily)
-- FIXED: Calls database function directly, no HTTP call needed
SELECT cron.schedule(
  'sync-tracker-reset',
  '0 0 * * *',
  'SELECT public.update_sync_tracker_cycle();'
);

-- Job 2: Refresh existing movies (01:00 UTC daily)
-- Uses dynamic service role key from system_settings
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

-- Job 3: Import new movies (02:00 UTC daily)
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

-- Job 4: Enrich with OMDb data (03:00 UTC daily)
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

-- Job 5: Store movie posters (03:30 UTC on 1st of each month)
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