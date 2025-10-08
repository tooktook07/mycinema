-- Drop and recreate RLS policies to explicitly require authentication
-- This prevents potential security issues with the 'public' role

-- sync_history table
DROP POLICY IF EXISTS "Admins can view all sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Admins can insert sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Admins can update sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Admins can delete sync history" ON public.sync_history;

CREATE POLICY "Admins can view all sync history"
ON public.sync_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert sync history"
ON public.sync_history
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sync history"
ON public.sync_history
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sync history"
ON public.sync_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- user_activity_logs table
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.user_activity_logs;

CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert activity logs"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_ratings table
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.user_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.user_ratings;

CREATE POLICY "Users can view their own ratings"
ON public.user_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
ON public.user_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.user_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.user_ratings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- user_roles table (SELECT policy only)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- omdb_api_usage table
DROP POLICY IF EXISTS "Admins can view API usage" ON public.omdb_api_usage;
DROP POLICY IF EXISTS "Admins can insert API usage" ON public.omdb_api_usage;
DROP POLICY IF EXISTS "Admins can update API usage" ON public.omdb_api_usage;

CREATE POLICY "Admins can view API usage"
ON public.omdb_api_usage
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert API usage"
ON public.omdb_api_usage
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update API usage"
ON public.omdb_api_usage
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));