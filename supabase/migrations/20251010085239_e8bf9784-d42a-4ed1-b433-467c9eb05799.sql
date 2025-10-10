-- Security fix: Add explicit policies for user_activity_logs and sync_history

-- 1. User Activity Logs: Ensure only admins can view, no public access
-- Add explicit deny policy for non-admins (belt and suspenders approach)
CREATE POLICY "Non-admins cannot view activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Sync History: Allow users to view their own sync history
CREATE POLICY "Users can view their own sync history"
ON public.sync_history
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);