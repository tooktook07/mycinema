-- Phase 1: Add subscription and activity tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'canceled')),
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- Phase 2: Create user_activity_logs table for admin tracking
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  action_details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Only admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index on user_id and created_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type ON public.user_activity_logs(action_type);

-- Phase 3: Create function to get watchlist count for a user
CREATE OR REPLACE FUNCTION public.get_user_watchlist_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_ratings
  WHERE user_id = p_user_id
    AND in_watchlist = true;
$$;

-- Phase 4: Create function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'user_id', p_user_id,
    'movies_rated', (SELECT COUNT(*) FROM public.user_ratings WHERE user_id = p_user_id AND user_rating IS NOT NULL),
    'watchlist_count', (SELECT COUNT(*) FROM public.user_ratings WHERE user_id = p_user_id AND in_watchlist = true),
    'subscription_tier', (SELECT subscription_tier FROM public.profiles WHERE user_id = p_user_id),
    'subscription_status', (SELECT subscription_status FROM public.profiles WHERE user_id = p_user_id),
    'last_login_at', (SELECT last_login_at FROM public.profiles WHERE user_id = p_user_id),
    'created_at', (SELECT created_at FROM public.profiles WHERE user_id = p_user_id)
  );
$$;

-- Phase 5: Create function to get user activity summary
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_activities', (
      SELECT COUNT(*)
      FROM public.user_activity_logs
      WHERE user_id = p_user_id
        AND created_at > now() - (p_days || ' days')::interval
    ),
    'activity_by_type', (
      SELECT json_object_agg(action_type, count)
      FROM (
        SELECT action_type, COUNT(*) as count
        FROM public.user_activity_logs
        WHERE user_id = p_user_id
          AND created_at > now() - (p_days || ' days')::interval
        GROUP BY action_type
      ) sub
    ),
    'recent_activities', (
      SELECT json_agg(
        json_build_object(
          'action_type', action_type,
          'created_at', created_at,
          'action_details', action_details
        )
      )
      FROM (
        SELECT action_type, created_at, action_details
        FROM public.user_activity_logs
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    )
  );
$$;

-- Phase 6: Create RLS policy for profiles to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 7: Create RLS policy for profiles to allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));