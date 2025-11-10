-- Update cron jobs to run starting at 12:00 PM with gaps
-- Import new movies: 12:00 PM
-- Daily refresh: 1:00 PM  
-- OMDb enrichment: 2:00 PM
-- Poster storage: 3:00 PM

-- Update import-new-movies-pipeline to run at 12:00 PM
SELECT cron.alter_job(
  job_id := 59,
  schedule := '0 12 * * *'
);

-- Update daily-refresh-pipeline to run at 1:00 PM
SELECT cron.alter_job(
  job_id := 60,
  schedule := '0 13 * * *'
);

-- Update enrich-with-omdb to run at 2:00 PM
SELECT cron.alter_job(
  job_id := 61,
  schedule := '0 14 * * *'
);

-- Update store-posters to run at 3:00 PM
SELECT cron.alter_job(
  job_id := 62,
  schedule := '0 15 * * *'
);