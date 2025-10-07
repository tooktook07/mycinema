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

  try {
    const { batchSize = 50, forceRefresh = false } = await req.json();
    const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY");

    // Initialize Supabase client with auth
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});