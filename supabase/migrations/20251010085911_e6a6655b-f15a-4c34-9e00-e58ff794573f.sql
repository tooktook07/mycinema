-- Priority 1: Fix Profile Update Privilege Escalation (CRITICAL)
-- Use a BEFORE UPDATE trigger to validate subscription field changes

-- First, create the validation function
CREATE OR REPLACE FUNCTION public.validate_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to update everything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, prevent changes to subscription fields
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION 'Only admins can modify subscription_tier';
  END IF;
  
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'Only admins can modify subscription_status';
  END IF;
  
  IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
    RAISE EXCEPTION 'Only admins can modify subscription_expires_at';
  END IF;
  
  IF NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at THEN
    RAISE EXCEPTION 'Only admins can modify subscription_started_at';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_profile_subscription_updates ON public.profiles;
CREATE TRIGGER validate_profile_subscription_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_updates();

-- Add documentation comment
COMMENT ON TABLE public.profiles IS 'User profile data. Users can update: theme, last_login_at. Admins can update all fields including subscription_tier, subscription_status, subscription_expires_at.';

-- Priority 4: Add Security Monitoring Function (RECOMMENDED)
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(p_user_id uuid)
RETURNS TABLE(
  alert_type text,
  severity text,
  details jsonb
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for multiple failed login attempts
  RETURN QUERY
  SELECT 
    'multiple_failed_logins'::text,
    'high'::text,
    jsonb_build_object(
      'count', COUNT(*),
      'time_window', '1 hour'
    )
  FROM public.user_activity_logs
  WHERE user_id = p_user_id
    AND action_type = 'login_failed'
    AND created_at > NOW() - INTERVAL '1 hour'
  HAVING COUNT(*) >= 5;
  
  -- Check for unusual IP address changes
  RETURN QUERY
  SELECT 
    'ip_address_change'::text,
    'medium'::text,
    jsonb_build_object(
      'distinct_ips', COUNT(DISTINCT ip_address),
      'time_window', '24 hours'
    )
  FROM public.user_activity_logs
  WHERE user_id = p_user_id
    AND ip_address IS NOT NULL
    AND created_at > NOW() - INTERVAL '24 hours'
  HAVING COUNT(DISTINCT ip_address) > 3;
END;
$$;