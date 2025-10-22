-- Remove escape sequences from service_role_key
UPDATE public.system_settings
SET 
  value = jsonb_build_object('key', 
    replace(replace(value->>'key', '\"', ''), '\', '')
  ),
  updated_at = NOW()
WHERE key = 'service_role_key'
  AND (value->>'key') LIKE '%\\%';