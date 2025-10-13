-- Manual trigger of all automated pipelines with detailed logging
-- This simulates the cron jobs running

DO $$
DECLARE
  tracker_result RECORD;
  current_cycle_day INTEGER;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '🚀 STARTING AUTOMATED PIPELINE TEST RUN';
  RAISE NOTICE '⏰ Execution Time: %', NOW();
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  -- ========================================
  -- STEP 1: SYNC TRACKER RESET (Midnight Cron Job)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 1/3: SYNC TRACKER RESET';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE '⏰ This job normally runs daily at 00:00 UTC';
  RAISE NOTICE '🔄 Calling update_sync_tracker_cycle()...';
  
  -- Execute the sync tracker update
  PERFORM update_sync_tracker_cycle();
  
  -- Get current state
  SELECT cycle_day INTO current_cycle_day 
  FROM movie_sync_tracker 
  LIMIT 1;
  
  RAISE NOTICE '✅ Sync tracker successfully updated';
  RAISE NOTICE '📊 Current cycle day: % / 30', current_cycle_day;
  RAISE NOTICE '✓ STEP 1 COMPLETED';
  
  -- ========================================
  -- STEP 2: DAILY REFRESH PIPELINE
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 2/3: DAILY REFRESH PIPELINE';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE '⏰ This job normally runs daily at 02:00 UTC';
  RAISE NOTICE '🔄 Triggering refresh-movies-pipeline edge function...';
  RAISE NOTICE '📡 Making HTTP POST request to edge function...';
  
  PERFORM net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'trigger_source', 'automated'
    )
  );
  
  RAISE NOTICE '✅ Refresh pipeline request sent successfully';
  RAISE NOTICE '📝 Pipeline is now running in background';
  RAISE NOTICE '📊 Results will be recorded in sync_history table';
  RAISE NOTICE '✓ STEP 2 TRIGGERED';
  
  -- ========================================
  -- STEP 3: NEW MOVIES IMPORT PIPELINE
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 3/3: NEW MOVIES IMPORT PIPELINE';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE '⏰ This job normally runs weekly on Sunday at 03:00 UTC';
  RAISE NOTICE '🔄 Triggering import-new-movies-pipeline edge function...';
  RAISE NOTICE '📡 Making HTTP POST request to edge function...';
  
  PERFORM net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'trigger_source', 'automated'
    )
  );
  
  RAISE NOTICE '✅ Import pipeline request sent successfully';
  RAISE NOTICE '📝 Pipeline is now running in background';
  RAISE NOTICE '📊 Results will be recorded in sync_history table';
  RAISE NOTICE '✓ STEP 3 TRIGGERED';
  
  -- ========================================
  -- COMPLETION SUMMARY
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL AUTOMATED PIPELINES TRIGGERED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 WHAT HAPPENS NEXT:';
  RAISE NOTICE '  1️⃣  Sync tracker updated to cycle day %', current_cycle_day;
  RAISE NOTICE '  2️⃣  Daily refresh pipeline processing movies...';
  RAISE NOTICE '  3️⃣  New imports pipeline checking for new releases...';
  RAISE NOTICE '';
  RAISE NOTICE '⏳ ESTIMATED COMPLETION TIME:';
  RAISE NOTICE '  • Refresh Pipeline: ~30-60 seconds';
  RAISE NOTICE '  • Import Pipeline: ~5-10 seconds';
  RAISE NOTICE '';
  RAISE NOTICE '📋 TO VIEW RESULTS:';
  RAISE NOTICE '  • Query sync_history table';
  RAISE NOTICE '  • Check edge function logs';
  RAISE NOTICE '  • Visit Sync History admin page';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Test run initiated at: %', NOW();
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
END $$;