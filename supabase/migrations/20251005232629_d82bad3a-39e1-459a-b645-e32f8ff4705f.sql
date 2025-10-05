-- Fix 1: Add proper RLS policies to user_roles table
-- Only system/admin users should be able to modify roles

-- Policy for admins to insert roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to update user roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for admins to delete user roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Handle sync_history.user_id NULL values
-- Delete any incomplete sync records with NULL user_id (these are orphaned records)
DELETE FROM public.sync_history WHERE user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.sync_history
ALTER COLUMN user_id SET NOT NULL;

-- Fix 3: Add DELETE policy to sync_history for cleanup
CREATE POLICY "Admins can delete sync history"
ON public.sync_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));