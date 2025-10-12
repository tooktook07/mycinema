-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;

-- Create new policy allowing anyone (including guests) to read settings
CREATE POLICY "Anyone can read system settings"
ON public.system_settings
FOR SELECT
USING (true);