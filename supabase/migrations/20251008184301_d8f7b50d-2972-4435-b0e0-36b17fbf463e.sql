-- Create public storage bucket for movie posters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'movie-posters', 
  'movie-posters', 
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Add column to track locally stored posters
ALTER TABLE public.movies 
ADD COLUMN IF NOT EXISTS local_poster_url TEXT;

-- RLS policy: Public read access for posters
CREATE POLICY "Public poster read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'movie-posters');

-- RLS policy: Admin upload access
CREATE POLICY "Admin can upload posters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'movie-posters' 
  AND (
    SELECT has_role(auth.uid(), 'admin'::app_role)
  )
);

-- RLS policy: Admin update access
CREATE POLICY "Admin can update posters"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'movie-posters' 
  AND (
    SELECT has_role(auth.uid(), 'admin'::app_role)
  )
);

-- RLS policy: Admin delete access
CREATE POLICY "Admin can delete posters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'movie-posters' 
  AND (
    SELECT has_role(auth.uid(), 'admin'::app_role)
  )
);