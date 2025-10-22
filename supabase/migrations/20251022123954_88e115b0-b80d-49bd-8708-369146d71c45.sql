-- Fix service_role_key format properly (remove extra quotes)
UPDATE public.system_settings
SET 
  value = jsonb_build_object('key', 
    CASE 
      WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}'
      WHEN jsonb_typeof(value) = 'object' AND value ? 'key' THEN value->>'key'
      ELSE value::text
    END
  ),
  updated_at = NOW()
WHERE key = 'service_role_key';