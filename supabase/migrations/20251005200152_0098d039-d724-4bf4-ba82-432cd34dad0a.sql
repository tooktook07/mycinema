-- Create sync_history table to track all sync operations
CREATE TABLE public.sync_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_mode boolean NOT NULL DEFAULT false,
  filters jsonb,
  total_found integer DEFAULT 0,
  imported integer DEFAULT 0,
  updated integer DEFAULT 0,
  removed integer DEFAULT 0,
  skipped integer DEFAULT 0,
  failed integer DEFAULT 0,
  logs text[],
  status text DEFAULT 'running',
  error_message text
);

-- Enable RLS
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync history
CREATE POLICY "Users can view their own sync history"
ON public.sync_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sync history
CREATE POLICY "Users can insert their own sync history"
ON public.sync_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_sync_history_user_id ON public.sync_history(user_id);
CREATE INDEX idx_sync_history_created_at ON public.sync_history(created_at DESC);