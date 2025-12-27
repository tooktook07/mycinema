-- Remove the unused SECURITY DEFINER function that could expose service keys
DROP FUNCTION IF EXISTS public.get_service_role_key();