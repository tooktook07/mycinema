/**
 * STORE POSTERS PIPELINE v2.1
 * 
 * AUTHENTICATION FLOW:
 * - Automated (cron): Uses service role key → finds first admin user → runs as that admin
 * - Manual (UI): Uses user JWT → verifies admin role → runs as that user
 * 
 * REQUIREMENTS:
 * - At least one user with 'admin' role must exist in user_roles table
 * - Service role key must be valid
 * - movie-posters storage bucket configured
 * 
 * FUNCTIONALITY:
 * - Downloads missing posters (100 at a time)
 * - Optimizes poster URLs to w342 size (perfect for display)
 * - Uploads to Supabase Storage
 * - Updates local_poster_url in movies table
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // === FUNCTION BOOT LOGGING ===
  console.log('═══════════════════════════════════════════');
  console.log('🖼️ FUNCTION BOOT: store-posters');
  console.log(`⏰ Boot timestamp: ${new Date().toISOString()}`);
  console.log(`📨 Request method: ${req.method}`);
  console.log('═══════════════════════════════════════════');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖼️ STORE POSTERS PIPELINE STARTED');
  console.log(`📍 Client: ${clientIP}`);
  console.log(`🌐 User Agent: ${userAgent}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const cronSecret = Deno.env.get('CRON_SECRET');

    // Check for cron secret authentication
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const isCronAuth = cronSecret && cronSecretHeader === cronSecret;

    const authHeader = req.headers.get('Authorization');
    
    if (!isCronAuth && !authHeader) {
      console.error('❌ Missing authorization');
      throw new Error('Missing authorization');
    }

    const token = authHeader ? authHeader.replace('Bearer ', '') : '';
    
    let userId: string;
    
    // Check if this is a cron authenticated call
    if (!isCronAuth) {
      console.log('🔐 Authenticating user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('❌ Authentication failed:', authError?.message);
        throw new Error('Unauthorized');
      }

      console.log(`🔍 Verifying admin role for user: ${user.id}`);
      const { data: hasAdminRole } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (!hasAdminRole) {
        console.error('❌ User does not have admin role');
        throw new Error('Admin access required');
      }

      console.log(`✅ Admin verified: ${user.email}`);
      userId = user.id;
    } else {
      console.log('🤖 CRON authenticated call');
      // Get first admin user for automated execution
      const { data: adminUser, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError || !adminUser) {
        console.error('❌ No admin user found for automated execution');
        throw new Error('No admin user found for automated execution');
      }
      
      console.log(`✅ Using admin user: ${adminUser.user_id}`);
      userId = adminUser.user_id;
    }

    const { limit = 100, offset = 0, syncHistoryId, trigger_source = 'manual' } = await req.json();
    
    console.log(`📊 Parameters: limit=${limit}, offset=${offset}, trigger=${trigger_source}`);

    console.log(`Starting optimized poster download for ${limit} movies, offset ${offset}`);

    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action_type: 'poster_storage_started',
        ip_address: clientIP,
        user_agent: userAgent,
        action_details: { limit, offset, trigger_source, optimization: 'w342' }
      });

    let currentSyncId = syncHistoryId;
    if (!currentSyncId) {
      const { data: syncRecord, error: syncError } = await supabase
        .from('sync_history')
        .insert({
          user_id: userId,
          sync_type: 'poster_storage',
          status: 'running',
          sync_mode: false,
          trigger_source,
          logs: [`Starting optimized poster storage - batch size: ${limit}, offset: ${offset}`]
        })
        .select()
        .single();

      if (syncError) throw syncError;
      currentSyncId = syncRecord.id;
    }

    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, poster, title, imdb_id')
      .is('local_poster_url', null)
      .not('poster', 'is', null)
      .range(offset, offset + limit - 1);

    if (moviesError) throw moviesError;

    if (!movies || movies.length === 0) {
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
    let optimized = 0;
    const logs: string[] = [];

    for (const movie of movies) {
      try {
        const logMsg = `Processing: ${movie.title}`;
        console.log(logMsg);
        logs.push(logMsg);
        
        // Optimize poster URL to use smaller w342 size (perfect for display at 292px width)
        let optimizedPosterUrl = movie.poster;
        if (movie.poster.includes('image.tmdb.org/t/p/')) {
          // Replace any size with w342 for optimal file size
          optimizedPosterUrl = movie.poster.replace(/\/w\d+\//, '/w342/');
          optimized++;
        }
        
        // Download the optimized poster
        const posterResponse = await fetch(optimizedPosterUrl);
        if (!posterResponse.ok) {
          const errorMsg = `Failed to download poster for ${movie.title}`;
          console.error(errorMsg);
          logs.push(`❌ ${errorMsg}`);
          failed++;
          continue;
        }

        const posterBlob = await posterResponse.blob();
        const posterBuffer = await posterBlob.arrayBuffer();
        
        // Use original format (TMDB images are already well-compressed JPEGs)
        const contentType = posterBlob.type;
        const fileExt = contentType.includes('png') ? 'png' : 'jpg';
        
        const fileName = `${movie.imdb_id || movie.id}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('movie-posters')
          .upload(filePath, posterBuffer, {
            contentType: contentType,
            upsert: true,
          });

        if (uploadError) {
          const errorMsg = `Upload error for ${movie.title}: ${uploadError.message}`;
          console.error(errorMsg);
          logs.push(`❌ ${errorMsg}`);
          failed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('movie-posters')
          .getPublicUrl(filePath);

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
        const successMsg = `✓ Stored optimized poster (w342) for: ${movie.title}`;
        console.log(successMsg);
        logs.push(successMsg);
      } catch (error) {
        const errorMsg = `Error processing ${movie.title}: ${(error as Error).message || String(error)}`;
        console.error(errorMsg);
        logs.push(`❌ ${errorMsg}`);
        failed++;
      }
    }

    const completionMsg = `Completed: ${processed} processed (${optimized} size-optimized), ${failed} failed`;
    console.log(completionMsg);
    logs.push(completionMsg);

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
        optimized,
        total: movies.length,
        message: `Successfully stored ${processed} posters (w342 optimized)`,
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
