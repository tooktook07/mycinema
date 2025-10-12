import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasRole) {
      throw new Error('Unauthorized: Admin role required');
    }

    const { movieId, syncOptions } = await req.json();

    if (!movieId) {
      throw new Error('movieId is required');
    }

    console.log(`Syncing movie ${movieId} with options:`, syncOptions);

    const results = {
      tmdb: { success: false, message: '' },
      omdb: { success: false, message: '' },
      poster: { success: false, message: '' }
    };

    // Get current movie data
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single();

    if (movieError || !movie) {
      throw new Error('Movie not found');
    }

    // Sync TMDB data if requested
    if (syncOptions?.tmdb) {
      try {
        const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
        if (!tmdbApiKey) {
          throw new Error('TMDB API key not configured');
        }

        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`
        );
        const searchData = await searchResponse.json();

        if (searchData.results && searchData.results.length > 0) {
          const tmdbMovie = searchData.results[0];
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${tmdbApiKey}&append_to_response=keywords,credits`
          );
          const details = await detailsResponse.json();

          const updateData: any = {
            title: details.title || movie.title,
            plot: details.overview || movie.plot,
            rating: details.vote_average || movie.rating,
            vote_count: details.vote_count || movie.vote_count,
            popularity: details.popularity || movie.popularity,
            genres: details.genres?.map((g: any) => g.name) || movie.genres,
            poster: details.poster_path ? `https://image.tmdb.org/t/p/original${details.poster_path}` : movie.poster,
            budget: details.budget || movie.budget,
            revenue: details.revenue || movie.revenue,
            runtime: details.runtime ? `${details.runtime} min` : movie.runtime,
            tagline: details.tagline || movie.tagline,
            keywords: details.keywords?.keywords?.map((k: any) => k.name) || movie.keywords,
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('movies')
            .update(updateData)
            .eq('id', movieId);

          results.tmdb = { success: true, message: 'TMDB data synced successfully' };
        } else {
          results.tmdb = { success: false, message: 'Movie not found on TMDB' };
        }
      } catch (error: any) {
        console.error('TMDB sync error:', error);
        results.tmdb = { success: false, message: error.message };
      }
    }

    // Sync OMDb data if requested
    if (syncOptions?.omdb) {
      try {
        const omdbApiKey = Deno.env.get('OMDB_API_KEY');
        if (!omdbApiKey) {
          throw new Error('OMDb API key not configured');
        }

        const omdbResponse = await fetch(
          `https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${movie.imdb_id}`
        );
        const omdbData = await omdbResponse.json();

        if (omdbData.Response === 'True') {
          const updateData: any = {
            imdb_rating: parseFloat(omdbData.imdbRating) || movie.imdb_rating,
            imdb_votes: parseInt(omdbData.imdbVotes?.replace(/,/g, '')) || movie.imdb_votes,
            metascore: parseInt(omdbData.Metascore) || movie.metascore,
            box_office: omdbData.BoxOffice || movie.box_office,
            awards: omdbData.Awards || movie.awards,
            director: omdbData.Director || movie.director,
            actors: omdbData.Actors || movie.actors,
            writing: omdbData.Writer || movie.writing,
            data_sources: { tmdb: true, omdb: true },
            last_omdb_fetch: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('movies')
            .update(updateData)
            .eq('id', movieId);

          // Increment OMDb usage
          await supabase.rpc('increment_omdb_usage', {
            usage_date: new Date().toISOString().split('T')[0]
          });

          results.omdb = { success: true, message: 'OMDb data synced successfully' };
        } else {
          results.omdb = { success: false, message: 'Movie not found on OMDb' };
        }
      } catch (error: any) {
        console.error('OMDb sync error:', error);
        results.omdb = { success: false, message: error.message };
      }
    }

    // Sync poster if requested
    if (syncOptions?.poster) {
      try {
        // Re-fetch movie to get latest poster URL
        const { data: latestMovie } = await supabase
          .from('movies')
          .select('poster, imdb_id')
          .eq('id', movieId)
          .single();

        if (latestMovie?.poster) {
          const posterResponse = await fetch(latestMovie.poster);
          if (!posterResponse.ok) {
            throw new Error('Failed to fetch poster');
          }

          const posterBlob = await posterResponse.blob();
          const fileName = `${latestMovie.imdb_id}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('movie-posters')
            .upload(fileName, posterBlob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('movie-posters')
            .getPublicUrl(fileName);

          await supabase
            .from('movies')
            .update({ 
              local_poster_url: publicUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', movieId);

          results.poster = { success: true, message: 'Poster synced successfully' };
        } else {
          results.poster = { success: false, message: 'No poster URL available' };
        }
      } catch (error: any) {
        console.error('Poster sync error:', error);
        results.poster = { success: false, message: error.message };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
