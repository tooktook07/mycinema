-- Add RLS policies for movie-posters storage bucket

-- Only admins or service role can upload movie posters
CREATE POLICY "Admins can upload movie posters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'movie-posters' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Everyone can read movie posters (bucket is public)
CREATE POLICY "Anyone can view movie posters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'movie-posters');

-- Only admins can delete movie posters
CREATE POLICY "Admins can delete movie posters"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'movie-posters' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can update movie posters
CREATE POLICY "Admins can update movie posters"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'movie-posters' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);