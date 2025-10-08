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

    const { limit = 100, offset = 0, syncHistoryId } = await req.json();

    console.log(`Starting poster download for ${limit} movies, offset ${offset}`);

    // Create or get sync history record
    let currentSyncId = syncHistoryId;
    if (!currentSyncId) {
      const { data: syncRecord, error: syncError } = await supabase
        .from('sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'poster_storage',
          status: 'running',
          sync_mode: false,
          logs: [`Starting poster storage - batch size: ${limit}, offset: ${offset}`]
        })
        .select()
        .single();

      if (syncError) throw syncError;
      currentSyncId = syncRecord.id;
    }

    // Get movies without local posters
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, poster, title, imdb_id')
      .is('local_poster_url', null)
      .not('poster', 'is', null)
      .range(offset, offset + limit - 1);

    if (moviesError) throw moviesError;

    if (!movies || movies.length === 0) {
      // Update sync history as completed
      if (currentSyncId) {
        await supabase
          .from('sync_history')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            logs: ['No movies to process']
          })
          .eq('id', currentSyncId);
      }

      return new Response(
        JSON.stringify({ 
          message: 'No movies to process', 
          processed: 0,
          syncHistoryId: currentSyncId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;
    const logs: string[] = [];

    for (const movie of movies) {
      try {
        const logMsg = `Processing: ${movie.title}`;
        console.log(logMsg);
        logs.push(logMsg);
        
        // Download the poster
        const posterResponse = await fetch(movie.poster);
        if (!posterResponse.ok) {
          const errorMsg = `Failed to download poster for ${movie.title}`;
          console.error(errorMsg);
          logs.push(`❌ ${errorMsg}`);
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
          const errorMsg = `Upload error for ${movie.title}: ${uploadError.message}`;
          console.error(errorMsg);
          logs.push(`❌ ${errorMsg}`);
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
          const errorMsg = `Update error for ${movie.title}: ${updateError.message}`;
          console.error(errorMsg);
          logs.push(`❌ ${errorMsg}`);
          failed++;
          continue;
        }

        processed++;
        const successMsg = `✓ Stored poster for: ${movie.title}`;
        console.log(successMsg);
        logs.push(successMsg);
      } catch (error) {
        const errorMsg = `Error processing ${movie.title}: ${(error as Error).message || String(error)}`;
        console.error(errorMsg);
        logs.push(`❌ ${errorMsg}`);
        failed++;
      }
    }

    const completionMsg = `Completed: ${processed} processed, ${failed} failed`;
    console.log(completionMsg);
    logs.push(completionMsg);

    // Update sync history
    if (currentSyncId) {
      await supabase
        .from('sync_history')
        .update({
          status: processed > 0 ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          imported: processed,
          failed: failed,
          total_found: movies.length,
          logs: logs
        })
        .eq('id', currentSyncId);
    }

    return new Response(
      JSON.stringify({ 
        processed, 
        failed, 
        total: movies.length,
        message: `Successfully stored ${processed} posters`,
        syncHistoryId: currentSyncId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
