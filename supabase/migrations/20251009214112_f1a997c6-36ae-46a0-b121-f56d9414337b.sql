-- Create function to increment OMDb API usage
CREATE OR REPLACE FUNCTION public.increment_omdb_usage(usage_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.omdb_api_usage (date, requests_count)
  VALUES (usage_date, 1)
  ON CONFLICT (date)
  DO UPDATE SET 
    requests_count = omdb_api_usage.requests_count + 1,
    updated_at = NOW();
END;
$$;