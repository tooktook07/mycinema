-- Update get_service_role_key function to read from system_settings
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Retrieve from system_settings
  SELECT value::text INTO service_key
  FROM public.system_settings
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  -- Remove quotes if present
  service_key := TRIM(BOTH '"' FROM service_key);
  
  RETURN service_key;
END;
$$;

-- Insert placeholder for service_role_key in system_settings if not exists
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'service_role_key',
  '"REPLACE_WITH_YOUR_SERVICE_ROLE_KEY"'::jsonb,
  'Service role key for automated cron jobs'
)
ON CONFLICT (key) DO NOTHING;