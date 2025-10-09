-- Add new sync types for unified pipelines
ALTER TABLE sync_history 
DROP CONSTRAINT IF EXISTS sync_history_sync_type_check;

ALTER TABLE sync_history 
ADD CONSTRAINT sync_history_sync_type_check 
CHECK (sync_type IN (
  'tmdb_import',
  'tmdb_sync',
  'omdb_enrichment', 
  'poster_storage', 
  'daily_refresh',
  'new_imports'
));