-- Fix security warning: Set search_path for get_current_sync_day function
DROP FUNCTION IF EXISTS public.get_current_sync_day();

CREATE OR REPLACE FUNCTION public.get_current_sync_day()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXTRACT(DAY FROM NOW())::INTEGER <= 30 
    THEN EXTRACT(DAY FROM NOW())::INTEGER
    ELSE 30
  END;
$$;

-- Fix security warning: Recreate automation_health as a regular function instead of a view
DROP VIEW IF EXISTS public.automation_health;

CREATE OR REPLACE FUNCTION public.get_automation_health()
RETURNS TABLE (
  sync_type TEXT,
  sync_date DATE,
  runs BIGINT,
  total_imported BIGINT,
  total_updated BIGINT,
  total_failed BIGINT,
  avg_duration_seconds NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sync_type,
    DATE(created_at) as sync_date,
    COUNT(*) as runs,
    SUM(imported) as total_imported,
    SUM(updated) as total_updated,
    SUM(failed) as total_failed,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))) as avg_duration_seconds
  FROM sync_history
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY sync_type, DATE(created_at)
  ORDER BY sync_date DESC, sync_type;
$$;