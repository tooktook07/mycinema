-- Fix service_role_key format in system_settings
-- Convert plain JWT string to proper JSONB format: {"key": "jwt_token"}
UPDATE public.system_settings
SET 
  value = jsonb_build_object('key', value::text),
  updated_at = NOW()
WHERE key = 'service_role_key'
  AND jsonb_typeof(value) = 'string';