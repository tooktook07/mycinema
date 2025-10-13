-- Fix movie_sync_tracker table and update cron jobs

-- Step 1: Clean up movie_sync_tracker duplicates
DELETE FROM public.movie_sync_tracker
WHERE id NOT IN (
  SELECT id FROM public.movie_sync_tracker
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
);

-- Step 2: Reset tracker to clean state  
UPDATE public.movie_sync_tracker
SET 
  cycle_day = 1,
  movies_processed = 0,
  last_processed_at = NOW(),
  updated_at = NOW();

-- Step 3: Create function to safely update sync tracker
CREATE OR REPLACE FUNCTION update_sync_tracker_cycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_day INTEGER;
  next_day INTEGER;
BEGIN
  SELECT cycle_day INTO current_day FROM public.movie_sync_tracker LIMIT 1;
  
  IF current_day IS NULL THEN
    INSERT INTO public.movie_sync_tracker (cycle_day, movies_processed, last_processed_at)
    VALUES (1, 0, NOW())
    ON CONFLICT (cycle_day) DO NOTHING;
  ELSE
    next_day := CASE WHEN current_day >= 30 THEN 1 ELSE current_day + 1 END;
    
    UPDATE public.movie_sync_tracker
    SET 
      cycle_day = next_day,
      movies_processed = 0,
      last_processed_at = NOW(),
      updated_at = NOW();
    
    DELETE FROM public.movie_sync_tracker
    WHERE id NOT IN (
      SELECT id FROM public.movie_sync_tracker
      ORDER BY updated_at DESC
      LIMIT 1
    );
  END IF;
END;
$$;

-- Step 4: Safely unschedule existing cron jobs (ignore errors if they don't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('update-sync-tracker');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-refresh-pipeline');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('new-movies-import-pipeline');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Step 5: Create new cron jobs
SELECT cron.schedule(
  'update-sync-tracker',
  '0 0 * * *',
  'SELECT update_sync_tracker_cycle();'
);

SELECT cron.schedule(
  'daily-refresh-pipeline',
  '30 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('service_role.key', true) || '"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'new-movies-import-pipeline',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('service_role.key', true) || '"}'::jsonb,
    body := '{"trigger_source": "automated"}'::jsonb
  ) as request_id;
  $$
);