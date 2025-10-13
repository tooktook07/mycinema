-- Fix security warning: Function Search Path Mutable
-- Set search_path to empty string and fully qualify all references

CREATE OR REPLACE FUNCTION update_sync_tracker_cycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_day INTEGER;
  next_day INTEGER;
BEGIN
  -- Get current cycle day (fully qualified table reference)
  SELECT cycle_day INTO current_day FROM public.movie_sync_tracker LIMIT 1;
  
  IF current_day IS NULL THEN
    -- Initialize if no tracker exists
    INSERT INTO public.movie_sync_tracker (cycle_day, movies_processed, last_processed_at)
    VALUES (1, 0, NOW())
    ON CONFLICT (cycle_day) DO NOTHING;
  ELSE
    -- Calculate next day (1-30 cycle)
    next_day := CASE WHEN current_day >= 30 THEN 1 ELSE current_day + 1 END;
    
    -- Update tracker
    UPDATE public.movie_sync_tracker
    SET 
      cycle_day = next_day,
      movies_processed = 0,
      last_processed_at = NOW(),
      updated_at = NOW();
    
    -- Ensure only one tracker row exists
    DELETE FROM public.movie_sync_tracker
    WHERE id NOT IN (
      SELECT id FROM public.movie_sync_tracker
      ORDER BY updated_at DESC
      LIMIT 1
    );
  END IF;
END;
$$;