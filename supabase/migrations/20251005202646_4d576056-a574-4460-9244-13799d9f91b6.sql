-- Update sync_history RLS policies to allow viewing without authentication
-- Since this appears to be a personal app without user authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Users can insert their own sync history" ON public.sync_history;

-- Create new policies that allow access without authentication
CREATE POLICY "Sync history is viewable by everyone"
  ON public.sync_history
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sync history"
  ON public.sync_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sync history"
  ON public.sync_history
  FOR UPDATE
  USING (true);