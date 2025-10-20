-- Fix get_service_role_key() to extract key from jsonb object correctly
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_key TEXT;
BEGIN
  -- Extract the key from the jsonb object: {"key": "actual_jwt_token"}
  SELECT value->>'key' INTO service_key
  FROM public.system_settings
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  RETURN service_key;
END;
$$;