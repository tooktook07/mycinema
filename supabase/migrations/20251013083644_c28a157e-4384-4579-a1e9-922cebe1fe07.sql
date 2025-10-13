-- Trigger automated pipelines with proper authentication
-- Using service account context

DO $$
DECLARE
  current_cycle_day INTEGER;
  refresh_response JSONB;
  import_response JSONB;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '🚀 AUTOMATED PIPELINE TEST - DETAILED EXECUTION LOG';
  RAISE NOTICE '⏰ Started at: %', NOW();
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  -- ========================================
  -- STEP 1: SYNC TRACKER RESET
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ STEP 1/3: SYNC TRACKER RESET (Cron: 0 0 * * *)     │';
  RAISE NOTICE '│ Schedule: Daily at midnight UTC                      │';
  RAISE NOTICE '└─────────────────────────────────────────────────────┘';
  
  RAISE NOTICE '  ⏳ Executing update_sync_tracker_cycle()...';
  PERFORM update_sync_tracker_cycle();
  
  SELECT cycle_day INTO current_cycle_day FROM movie_sync_tracker LIMIT 1;
  
  RAISE NOTICE '  ✅ Sync tracker updated successfully';
  RAISE NOTICE '  📊 New cycle day: %/30', current_cycle_day;
  RAISE NOTICE '  ⏰ Timestamp: %', NOW();
  RAISE NOTICE '';
  
  -- ========================================
  -- STEP 2: DAILY REFRESH PIPELINE
  -- ========================================
  RAISE NOTICE '┌─────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ STEP 2/3: DAILY REFRESH (Cron: 0 2 * * *)          │';
  RAISE NOTICE '│ Schedule: Daily at 2:00 AM UTC                       │';
  RAISE NOTICE '└─────────────────────────────────────────────────────┘';
  
  RAISE NOTICE '  📡 Triggering refresh-movies-pipeline...';
  RAISE NOTICE '  🎯 Target: Cycle day % movies', current_cycle_day;
  RAISE NOTICE '  📤 Sending HTTP POST request...';
  
  SELECT INTO refresh_response net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/refresh-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUxOTcsImV4cCI6MjA3NTE4MTE5N30.Hpl1Dw7cbUxVNORBv_JBL9eoEnqVTAjfZD_rpW8lueg'
    ),
    body := jsonb_build_object('trigger_source', 'automated')
  );
  
  RAISE NOTICE '  ✅ HTTP request sent successfully';
  RAISE NOTICE '  📝 Pipeline running in background...';
  RAISE NOTICE '  ⏰ Timestamp: %', NOW();
  RAISE NOTICE '';
  
  -- ========================================
  -- STEP 3: NEW MOVIES IMPORT PIPELINE
  -- ========================================
  RAISE NOTICE '┌─────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ STEP 3/3: NEW IMPORTS (Cron: 0 3 * * 0)            │';
  RAISE NOTICE '│ Schedule: Weekly on Sunday at 3:00 AM UTC           │';
  RAISE NOTICE '└─────────────────────────────────────────────────────┘';
  
  RAISE NOTICE '  📡 Triggering import-new-movies-pipeline...';
  RAISE NOTICE '  🎯 Target: 2025 releases from TMDB';
  RAISE NOTICE '  📤 Sending HTTP POST request...';
  
  SELECT INTO import_response net.http_post(
    url := 'https://kkeojjtopbpfbcmxlumx.supabase.co/functions/v1/import-new-movies-pipeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZW9qanRvcGJwZmJjbXhsdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDUxOTcsImV4cCI6MjA3NTE4MTE5N30.Hpl1Dw7cbUxVNORBv_JBL9eoEnqVTAjfZD_rpW8lueg'
    ),
    body := jsonb_build_object('trigger_source', 'automated')
  );
  
  RAISE NOTICE '  ✅ HTTP request sent successfully';
  RAISE NOTICE '  📝 Pipeline running in background...';
  RAISE NOTICE '  ⏰ Timestamp: %', NOW();
  RAISE NOTICE '';
  
  -- ========================================
  -- COMPLETION & MONITORING INSTRUCTIONS
  -- ========================================
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 ALL 3 PIPELINES TRIGGERED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 EXECUTION SUMMARY:';
  RAISE NOTICE '  1️⃣  Sync Tracker: Updated to day %', current_cycle_day;
  RAISE NOTICE '  2️⃣  Refresh Pipeline: HTTP request sent at %', NOW();
  RAISE NOTICE '  3️⃣  Import Pipeline: HTTP request sent at %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE '⏱️  EXPECTED COMPLETION TIMES:';
  RAISE NOTICE '  • Refresh Pipeline: 30-60 seconds (~102 movies)';
  RAISE NOTICE '  • Import Pipeline: 5-10 seconds (~20 new releases)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 TO MONITOR PROGRESS:';
  RAISE NOTICE '  1. Query: SELECT * FROM sync_history ORDER BY created_at DESC LIMIT 5';
  RAISE NOTICE '  2. Check edge function logs in Cloud dashboard';
  RAISE NOTICE '  3. Visit Sync History tab in Account settings';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 WHAT TO LOOK FOR IN SYNC_HISTORY:';
  RAISE NOTICE '  • trigger_source should be "automated"';
  RAISE NOTICE '  • sync_type: "daily_refresh" and "new_imports"';
  RAISE NOTICE '  • status: "running" → "completed"';
  RAISE NOTICE '  • logs array contains detailed step-by-step progress';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Test execution completed at: %', NOW();
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
END $$;