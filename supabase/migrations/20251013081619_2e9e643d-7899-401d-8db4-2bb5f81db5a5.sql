-- Manual test run of all automated pipelines

DO $$
BEGIN
  -- Step 1: Update sync tracker
  RAISE NOTICE '🔄 Step 1: Updating sync tracker...';
  PERFORM update_sync_tracker_cycle();
  RAISE NOTICE '✓ Sync tracker updated to cycle day 2';
  
  -- Step 2: Trigger refresh pipeline
  RAISE NOTICE '🔄 Step 2: Triggering refresh pipeline...';
  PERFORM net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('service_role.key', true)
    ),
    body := jsonb_build_object(
      'trigger_source', 'manual_test'
    )
  );
  RAISE NOTICE '✓ Refresh pipeline HTTP request sent';
  
  -- Step 3: Trigger import pipeline  
  RAISE NOTICE '🔄 Step 3: Triggering import pipeline...';
  PERFORM net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('service_role.key', true)
    ),
    body := jsonb_build_object(
      'trigger_source', 'manual_test'
    )
  );
  RAISE NOTICE '✓ Import pipeline HTTP request sent';
  
  RAISE NOTICE '🎉 All pipeline triggers executed!';
  RAISE NOTICE 'The pipelines are now running in the background.';
  RAISE NOTICE 'Check the sync_history table for results in a few minutes.';
END $$;