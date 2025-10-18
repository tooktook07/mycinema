-- Clean up duplicate and old cron jobs
-- This migration removes old/duplicate automation jobs while keeping the 5 core jobs

-- Remove old duplicate jobs
SELECT cron.unschedule('update-sync-tracker');
SELECT cron.unschedule('omdb-enrichment');
SELECT cron.unschedule('omdb-refresh');
SELECT cron.unschedule('new-movies-import');

-- The following jobs should remain active:
-- 1. sync-tracker-reset (00:00 UTC daily)
-- 2. daily-refresh-pipeline (01:00 UTC daily)
-- 3. new-movies-import (02:00 UTC daily)
-- 4. enrich-with-omdb (03:00 UTC daily)
-- 5. store-posters (03:30 UTC daily)