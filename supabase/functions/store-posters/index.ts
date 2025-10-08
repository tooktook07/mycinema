import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: hasAdminRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasAdminRole) {
      throw new Error('Admin access required');
    }

    const { limit = 100, offset = 0 } = await req.json();

    console.log(`Starting poster download for ${limit} movies, offset ${offset}`);

    // Get movies without local posters
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, poster, title, imdb_id')
      .is('local_poster_url', null)
      .not('poster', 'is', null)
      .range(offset, offset + limit - 1);

    if (moviesError) throw moviesError;

    if (!movies || movies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No movies to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;

    for (const movie of movies) {
      try {
        console.log(`Processing: ${movie.title}`);
        
        // Download the poster
        const posterResponse = await fetch(movie.poster);
        if (!posterResponse.ok) {
          console.error(`Failed to download poster for ${movie.title}`);
          failed++;
          continue;
        }

        const posterBlob = await posterResponse.blob();
        const posterBuffer = await posterBlob.arrayBuffer();
        
        // Generate filename
        const fileExt = movie.poster.includes('.jpg') ? 'jpg' : 'png';
        const fileName = `${movie.imdb_id || movie.id}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('movie-posters')
          .upload(filePath, posterBuffer, {
            contentType: posterBlob.type,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${movie.title}:`, uploadError);
          failed++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('movie-posters')
          .getPublicUrl(filePath);

        // Update movie record
        const { error: updateError } = await supabase
          .from('movies')
          .update({ local_poster_url: urlData.publicUrl })
          .eq('id', movie.id);

        if (updateError) {
          console.error(`Update error for ${movie.title}:`, updateError);
          failed++;
          continue;
        }

        processed++;
        console.log(`✓ Stored poster for: ${movie.title}`);
      } catch (error) {
        console.error(`Error processing ${movie.title}:`, error);
        failed++;
      }
    }

    console.log(`Completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        processed, 
        failed, 
        total: movies.length,
        message: `Successfully stored ${processed} posters` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
