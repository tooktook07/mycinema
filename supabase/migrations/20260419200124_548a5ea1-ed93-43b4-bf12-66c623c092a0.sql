
-- 1. Replace profile update policy with one that has WITH CHECK ensuring user_id stays the same
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Add RESTRICTIVE policy on user_roles to block any non-admin self-insert.
-- Restrictive policies are AND-ed with permissive ones, providing defense-in-depth.
CREATE POLICY "Only admins can insert roles (restrictive)"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
