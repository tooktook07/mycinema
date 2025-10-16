/**
 * ENRICH WITH OMDB PIPELINE
 * 
 * AUTHENTICATION FLOW:
 * - Automated (cron): Uses service role key → finds first admin user → runs as that admin
 * - Manual (UI): Uses user JWT → verifies admin role → runs as that user
 * 
 * REQUIREMENTS:
 * - At least one user with 'admin' role must exist in user_roles table
 * - OMDb API key configured
 * - Respects OMDb daily API limit (1000 requests)
 * 
 * FUNCTIONALITY:
 * - Enriches movies missing OMDb data
 * - Fetches: IMDb rating, votes, Metascore, Box Office, Awards
 * - Batch size: 50 movies (automated) or custom (manual)
 * - Tracks API usage to prevent exceeding limits
 * - Updates last_omdb_fetch timestamp
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Capture client IP address for security logging
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ OMDB ENRICHMENT PIPELINE STARTED');
  console.log(`📍 Client: ${clientIP}`);
  console.log(`🌐 User Agent: ${userAgent}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Parse and validate input parameters
    const body = await req.json();
    const batchSize = typeof body.batchSize === 'number' && body.batchSize >= 1 && body.batchSize <= 100 ? body.batchSize : 50;
    const forceRefresh = typeof body.forceRefresh === 'boolean' ? body.forceRefresh : false;
    const trigger_source = body.trigger_source === 'automated' ? 'automated' : 'manual';
    
    console.log(`📊 Parameters: batchSize=${batchSize}, forceRefresh=${forceRefresh}, trigger=${trigger_source}`);
    
    const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY");

    // Initialize Supabase client with auth
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    console.log('🔐 Authenticating user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Verifying admin role for user: ${user.id}`);
    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.error('❌ User does not have admin role');
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`✅ Admin verified: ${user.email}`);

    if (!OMDB_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OMDb API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const logs: string[] = [];
    const logMsg = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    // Create sync history record
    const { data: syncRecord, error: syncCreateError } = await supabaseAdmin
      .from("sync_history")
      .insert({
        user_id: user.id,
        sync_mode: false,
        sync_type: 'omdb_enrichment',
        status: 'running',
        filters: { batchSize, forceRefresh },
        trigger_source,
        total_found: 0,
        imported: 0,
        updated: 0,
        removed: 0,
        skipped: 0,
        failed: 0,
        logs: []
      })
      .select()
      .single();

    if (syncCreateError || !syncRecord) {
      logMsg(`⚠️ Failed to create sync history: ${syncCreateError?.message}`);
    }

    const syncId = syncRecord?.id;

    // Log the enrichment activity with IP address
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'omdb_enrichment_started',
        ip_address: clientIP,
        user_agent: userAgent,
        action_details: { batch_size: batchSize, force_refresh: forceRefresh, trigger_source }
      });

    // Find movies to enrich
    let query = supabaseAdmin
      .from("movies")
      .select("id, title, imdb_id, last_omdb_fetch, data_sources")
      .like("imdb_id", "tt%"); // Only movies with real IMDB IDs

    // Filter based on forceRefresh
    if (!forceRefresh) {
      query = query.or("data_sources->omdb.is.null,data_sources->omdb.eq.false,last_omdb_fetch.is.null");
    } else {
      // Refresh movies older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.or(`last_omdb_fetch.is.null,last_omdb_fetch.lt.${thirtyDaysAgo.toISOString()}`);
    }

    const { data: movies, error: queryError } = await query.limit(batchSize);

    if (queryError) {
      throw new Error(`Failed to query movies: ${queryError.message}`);
    }

    if (!movies || movies.length === 0) {
      logMsg("No movies to enrich");
      
      // Update sync history
      if (syncId) {
        await supabaseAdmin
          .from("sync_history")
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            logs: ["No movies to enrich"]
          })
          .eq("id", syncId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          enriched: 0,
          failed: 0,
          skipped: 0,
          remainingUnenriched: 0,
          logs: ["No movies to enrich"],
          message: "All movies are already enriched"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logMsg(`Found ${movies.length} movies to enrich`);

    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    // Track API usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseAdmin
      .from("omdb_api_usage")
      .select("requests_count")
      .eq("date", today)
      .maybeSingle();

    let currentUsage = usageData?.requests_count || 0;

    for (const movie of movies) {
      try {
        // Check rate limit (leave buffer of 200 for other operations)
        if (currentUsage >= 800) {
          logMsg(`⚠️ Approaching daily rate limit (${currentUsage}/1000). Stopping enrichment.`);
          break;
        }

        // Fetch OMDb data
        const omdbResponse = await fetch(
          `https://www.omdbapi.com/?i=${movie.imdb_id}&apikey=${OMDB_API_KEY}&plot=full`
        );

        if (!omdbResponse.ok) {
          throw new Error(`OMDb API error: ${omdbResponse.status}`);
        }

        const omdbData = await omdbResponse.json();
        currentUsage++;

        if (omdbData.Response === "False") {
          logMsg(`⊘ Skipped: "${movie.title}" - ${omdbData.Error}`);
          skipped++;
          continue;
        }

        // Validate data quality
        const hasUsefulData = 
          (omdbData.imdbRating && omdbData.imdbRating !== "N/A") ||
          (omdbData.BoxOffice && omdbData.BoxOffice !== "N/A") ||
          (omdbData.Awards && omdbData.Awards !== "N/A");

        if (!hasUsefulData) {
          logMsg(`⊘ Skipped: "${movie.title}" - No useful OMDb data`);
          skipped++;
          continue;
        }

        // Parse and update movie data
        const updateData: any = {
          imdb_rating: omdbData.imdbRating !== "N/A" ? parseFloat(omdbData.imdbRating) : null,
          imdb_votes: omdbData.imdbVotes !== "N/A" ? parseInt(omdbData.imdbVotes.replace(/,/g, '')) : null,
          metascore: omdbData.Metascore !== "N/A" ? parseInt(omdbData.Metascore) : null,
          box_office: omdbData.BoxOffice !== "N/A" ? omdbData.BoxOffice : null,
          awards: omdbData.Awards !== "N/A" ? omdbData.Awards : null,
          data_sources: { tmdb: true, omdb: true },
          last_omdb_fetch: new Date().toISOString()
        };

        const { error: updateError } = await supabaseAdmin
          .from("movies")
          .update(updateData)
          .eq("id", movie.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        enriched++;
        logMsg(`✨ Enriched: "${movie.title}" (IMDB: ${updateData.imdb_rating || 'N/A'})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failed++;
        logMsg(`✗ Failed: "${movie.title}" - ${error.message}`);
      }
    }

    // Update API usage tracking
    await supabaseAdmin
      .from("omdb_api_usage")
      .upsert({
        date: today,
        requests_count: currentUsage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      });

    // Count remaining unenriched movies
    const { count: remainingCount } = await supabaseAdmin
      .from("movies")
      .select("id", { count: 'exact', head: true })
      .like("imdb_id", "tt%")
      .or("data_sources->omdb.is.null,data_sources->omdb.eq.false,last_omdb_fetch.is.null");

    const message = `Enrichment complete: ${enriched} enriched, ${failed} failed, ${skipped} skipped. ${remainingCount || 0} movies remaining.`;
    logMsg(message);

    // Update sync history with completion
    if (syncId) {
      await supabaseAdmin
        .from("sync_history")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_found: movies.length,
          imported: enriched, // Using 'imported' to mean 'enriched'
          skipped,
          failed,
          logs
        })
        .eq("id", syncId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: movies.length,
        enriched,
        failed,
        skipped,
        remainingUnenriched: remainingCount || 0,
        currentApiUsage: currentUsage,
        logs,
        message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in enrich-with-omdb function:", error);
    
    // Update sync history with error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        // Try to find the most recent running sync for this enrichment
        const { data: runningSyncs } = await supabaseAdmin
          .from("sync_history")
          .select("id")
          .eq("status", "running")
          .eq("sync_type", "omdb_enrichment")
          .order("created_at", { ascending: false })
          .limit(1);

        if (runningSyncs && runningSyncs.length > 0) {
          await supabaseAdmin
            .from("sync_history")
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage
            })
            .eq("id", runningSyncs[0].id);
        }
      }
    } catch (syncUpdateError) {
      console.error("Failed to update sync history with error:", syncUpdateError);
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});