-- CRITICAL FIX #1: Delete the exposed service role key from database
DELETE FROM system_settings WHERE key = 'service_role_key';

-- CRITICAL FIX #2: Fix system_settings RLS policy to use row-level filtering
DROP POLICY IF EXISTS "Anyone can read system settings" ON system_settings;

-- Allow public to read only non-sensitive settings
CREATE POLICY "Public can read non-sensitive settings" ON system_settings
  FOR SELECT USING (
    key IN ('accessibility_widget_enabled')
  );

-- Allow admins to read all settings
CREATE POLICY "Admins can read all settings" ON system_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- FIX #3: Clean up duplicate RLS policies on user_activity_logs
DROP POLICY IF EXISTS "Non-admins cannot view activity logs" ON user_activity_logs;