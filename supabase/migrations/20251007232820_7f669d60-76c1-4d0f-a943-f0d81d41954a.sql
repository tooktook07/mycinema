-- Phase 1: Add sync_type column to sync_history table
ALTER TABLE public.sync_history 
ADD COLUMN sync_type text DEFAULT 'tmdb_import';

-- Update existing records based on sync_mode
UPDATE public.sync_history 
SET sync_type = CASE 
  WHEN sync_mode = true THEN 'tmdb_sync' 
  ELSE 'tmdb_import' 
END;

-- Make sync_type NOT NULL
ALTER TABLE public.sync_history 
ALTER COLUMN sync_type SET NOT NULL;

-- Add constraint for valid sync types
ALTER TABLE public.sync_history
ADD CONSTRAINT sync_type_check CHECK (sync_type IN ('tmdb_import', 'tmdb_sync', 'omdb_enrichment'));

-- Create index for performance
CREATE INDEX idx_sync_history_type ON public.sync_history(sync_type);

-- Add comment for documentation
COMMENT ON COLUMN public.sync_history.sync_type IS 'Type of sync operation: tmdb_import, tmdb_sync, or omdb_enrichment';