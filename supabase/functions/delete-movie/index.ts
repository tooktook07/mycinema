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
      console.error('[INTERNAL] Missing authorization header');
      throw new Error('Authentication required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[INTERNAL] User not authenticated');
      throw new Error('Authentication required');
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasRole) {
      console.error('[INTERNAL] User lacks admin role:', user.id);
      throw new Error('Insufficient permissions');
    }

    const { movieId } = await req.json();

    if (!movieId || typeof movieId !== 'string') {
      throw new Error('Valid movieId is required');
    }

    console.log(`Deleting movie ${movieId}`);

    // Get movie data first to check for local poster
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('imdb_id, local_poster_url')
      .eq('id', movieId)
      .single();

    if (movieError) {
      console.error('Error fetching movie:', movieError);
    }

    // Delete local poster if exists
    if (movie?.local_poster_url) {
      try {
        const fileName = `${movie.imdb_id}.jpg`;
        const { error: deleteStorageError } = await supabase.storage
          .from('movie-posters')
          .remove([fileName]);

        if (deleteStorageError) {
          console.error('Error deleting poster from storage:', deleteStorageError);
        } else {
          console.log('Poster deleted from storage');
        }
      } catch (error) {
        console.error('Error during poster deletion:', error);
      }
    }

    // Delete user ratings associated with this movie
    const { error: ratingsError } = await supabase
      .from('user_ratings')
      .delete()
      .eq('media_id', movieId)
      .eq('media_type', 'movie');

    if (ratingsError) {
      console.error('Error deleting user ratings:', ratingsError);
    } else {
      console.log('User ratings deleted');
    }

    // Delete the movie
    const { error: deleteError } = await supabase
      .from('movies')
      .delete()
      .eq('id', movieId);

    if (deleteError) {
      console.error('[INTERNAL] Failed to delete movie:', deleteError);
      throw new Error('Operation failed');
    }

    console.log('Movie deleted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Movie and associated data deleted successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[INTERNAL] Error in delete-movie:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Operation failed',
        code: 'DELETE_ERROR' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
