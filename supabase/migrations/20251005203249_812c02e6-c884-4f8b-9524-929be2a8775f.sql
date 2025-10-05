-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Update sync_history RLS to require admin role
DROP POLICY IF EXISTS "Sync history is viewable by everyone" ON public.sync_history;
DROP POLICY IF EXISTS "Anyone can insert sync history" ON public.sync_history;
DROP POLICY IF EXISTS "Anyone can update sync history" ON public.sync_history;

CREATE POLICY "Admins can view all sync history"
  ON public.sync_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sync history"
  ON public.sync_history
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sync history"
  ON public.sync_history
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update user_movie_data to remove user_id requirement (it was causing issues)
-- and ensure it works with auth
ALTER TABLE public.user_movie_data ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.user_movie_data ALTER COLUMN user_id SET NOT NULL;