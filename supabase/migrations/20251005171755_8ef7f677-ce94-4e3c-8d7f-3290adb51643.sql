-- Create movies table
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imdb_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  rating NUMERIC(3,1),
  poster TEXT,
  genres TEXT[],
  plot TEXT,
  director TEXT,
  actors TEXT,
  runtime TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tv_shows table
CREATE TABLE public.tv_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imdb_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  rating NUMERIC(3,1),
  poster TEXT,
  genres TEXT[],
  plot TEXT,
  seasons INTEGER,
  episodes INTEGER,
  season_dates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_movie_data table for tracking watched, watchlist, and ratings
CREATE TABLE public.user_movie_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES public.movies(id) ON DELETE CASCADE,
  tv_show_id UUID REFERENCES public.tv_shows(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT false,
  in_watchlist BOOLEAN DEFAULT false,
  user_rating NUMERIC(3,1),
  watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, movie_id),
  UNIQUE(user_id, tv_show_id),
  CHECK ((movie_id IS NOT NULL AND tv_show_id IS NULL) OR (movie_id IS NULL AND tv_show_id IS NOT NULL))
);

-- Enable RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_movie_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movies (public read)
CREATE POLICY "Movies are viewable by everyone"
ON public.movies FOR SELECT
USING (true);

-- RLS Policies for tv_shows (public read)
CREATE POLICY "TV shows are viewable by everyone"
ON public.tv_shows FOR SELECT
USING (true);

-- RLS Policies for user_movie_data
CREATE POLICY "Users can view their own movie data"
ON public.user_movie_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movie data"
ON public.user_movie_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movie data"
ON public.user_movie_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movie data"
ON public.user_movie_data FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_movies_year ON public.movies(year);
CREATE INDEX idx_movies_imdb_id ON public.movies(imdb_id);
CREATE INDEX idx_tv_shows_start_year ON public.tv_shows(start_year);
CREATE INDEX idx_tv_shows_imdb_id ON public.tv_shows(imdb_id);
CREATE INDEX idx_user_movie_data_user_id ON public.user_movie_data(user_id);
CREATE INDEX idx_user_movie_data_watched ON public.user_movie_data(watched);
CREATE INDEX idx_user_movie_data_watchlist ON public.user_movie_data(in_watchlist);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tv_shows_updated_at
BEFORE UPDATE ON public.tv_shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_movie_data_updated_at
BEFORE UPDATE ON public.user_movie_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();