/**
 * REFRESH MOVIES PIPELINE v2.1
 * 
 * AUTHENTICATION FLOW:
 * - Automated (cron): Uses service role key → finds first admin user → runs as that admin
 * - Manual (UI): Uses user JWT → verifies admin role → runs as that user
 * 
 * REQUIREMENTS:
 * - At least one user with 'admin' role must exist in user_roles table
 * - Service role key must be valid
 * - User must have active session (manual only)
 * 
 * FUNCTIONALITY:
 * - Refreshes ~120 existing movies daily in 30-day cycle
 * - Updates TMDB data (ratings, votes, popularity)
 * - Enriches with OMDb data if missing or stale (>30 days)
 * - Downloads missing posters
 * - Removes movies below quality threshold (6+ stars, 1000+ votes)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoteTierConfig {
  currentYear: number;
  lastYear: number;
  twoToThreeYears: number;
  older: number;
}

const DEFAULT_TIERS: VoteTierConfig = {
  currentYear: 300,
  lastYear: 500,
  twoToThreeYears: 750,
  older: 1000
};

function getRequiredVoteCount(movieYear: number, tiers: VoteTierConfig): number {
  const currentYear = new Date().getFullYear();
  const yearsDiff = currentYear - movieYear;
  
  if (yearsDiff === 0) return tiers.currentYear;
  if (yearsDiff === 1) return tiers.lastYear;
  if (yearsDiff >= 2 && yearsDiff <= 3) return tiers.twoToThreeYears;
  return tiers.older;
}

serve(async (req) => {
  // === FUNCTION BOOT LOGGING ===
  console.log('═══════════════════════════════════════════');
  console.log('🚀 FUNCTION BOOT: refresh-movies-pipeline');
  console.log(`⏰ Boot timestamp: ${new Date().toISOString()}`);
  console.log(`📨 Request method: ${req.method}`);
  console.log('═══════════════════════════════════════════');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Capture client IP address for security logging
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 REFRESH MOVIES PIPELINE STARTED');
  console.log(`📍 Client: ${clientIP}`);
  console.log(`🌐 User Agent: ${userAgent}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')!;
    const omdbApiKey = Deno.env.get('OMDB_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header for authorization check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if this is a service role key (automated call)
    const isServiceRole = token === supabaseKey;

    let userId: string;

    if (isServiceRole) {
      // Automated call - use first admin user
      console.log('🤖 AUTOMATED EXECUTION via service role key');
      const { data: adminUser, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError || !adminUser) {
        console.error('❌ CRITICAL: No admin user found for automated execution');
        console.error('This means automated jobs cannot run!');
        console.error('Please ensure at least one user has the admin role in user_roles table');
        return new Response(JSON.stringify({ error: 'No admin user found for automated execution' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`✅ Using admin user: ${adminUser.user_id}`);
      userId = adminUser.user_id;
    } else {
      // Manual call - verify user is admin
      console.log('👤 MANUAL EXECUTION via user JWT');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('❌ Authentication failed:', authError?.message);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`🔍 Verifying admin role for user: ${user.id}`);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        console.error('❌ User does not have admin role');
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`✅ Admin verified: ${user.email}`);
      userId = user.id;
    }

    const logs: string[] = [];
    const addLog = (message: string) => {
      console.log(message);
      logs.push(`${new Date().toISOString()}: ${message}`);
    };

    addLog(isServiceRole ? '🤖 Starting daily refresh pipeline (automated)' : '🔄 Starting daily refresh pipeline (manual)');

    // Log the pipeline activity with IP address
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action_type: 'daily_refresh_started',
        ip_address: clientIP,
        user_agent: userAgent,
        action_details: { trigger_source: isServiceRole ? 'automated' : 'manual' }
      });

    // Create sync history record
    const { data: syncHistory, error: syncError } = await supabase
      .from('sync_history')
      .insert({
        sync_type: 'daily_refresh',
        trigger_source: isServiceRole ? 'automated' : 'manual',
        user_id: userId,
        status: 'running',
      })
      .select()
      .single();

    if (syncError || !syncHistory) {
      throw new Error(`Failed to create sync history: ${syncError?.message}`);
    }

    let imported = 0, updated = 0, failed = 0, skipped = 0, removed = 0;

    try {
      // Get current cycle day (1-30)
      const { data: cycleData } = await supabase.rpc('get_current_sync_day');
      const currentDay = cycleData || 1;
      addLog(`Current cycle day: ${currentDay}/30`);

      // Get total movies count
      const { count: totalMovies } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });

      const batchSize = Math.ceil((totalMovies || 0) / 30);
      addLog(`Total movies: ${totalMovies}, Batch size: ${batchSize}`);

      // Calculate offset based on cycle day
      const offset = (currentDay - 1) * batchSize;

      // Fetch movies for today's batch
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('id, imdb_id, title, local_poster_url, poster, last_omdb_fetch, data_sources')
        .order('created_at')
        .range(offset, offset + batchSize - 1);

      if (moviesError) {
        throw new Error(`Failed to fetch movies: ${moviesError.message}`);
      }

      addLog(`Processing ${movies?.length || 0} movies for refresh`);

      for (const movie of movies || []) {
        try {
          // 1. Refresh TMDB data
          addLog(`Refreshing TMDB data for: ${movie.title}`);
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/find/${movie.imdb_id}?api_key=${tmdbApiKey}&external_source=imdb_id`
          );
          
          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();
            const movieData = tmdbData.movie_results?.[0];
            
            if (movieData) {
              // Update movie with fresh TMDB data
              await supabase
                .from('movies')
                .update({
                  rating: movieData.vote_average,
                  vote_count: movieData.vote_count,
                  popularity: movieData.popularity,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', movie.id);
              
              updated++;
              addLog(`✓ Updated TMDB data for: ${movie.title}`);
            }
          }

          // 2. Check if OMDb enrichment needed
          const needsOmdb = !movie.data_sources?.omdb || 
            !movie.last_omdb_fetch || 
            (new Date().getTime() - new Date(movie.last_omdb_fetch).getTime()) > 30 * 24 * 60 * 60 * 1000;

          if (needsOmdb) {
            addLog(`Enriching with OMDb: ${movie.title}`);
            const omdbResponse = await fetch(
              `http://www.omdbapi.com/?i=${movie.imdb_id}&apikey=${omdbApiKey}&plot=full`
            );
            
            if (omdbResponse.ok) {
              const omdbData = await omdbResponse.json();
              
              if (omdbData.Response === 'True') {
                await supabase
                  .from('movies')
                  .update({
                    imdb_rating: omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : null,
                    imdb_votes: omdbData.imdbVotes !== 'N/A' ? parseInt(omdbData.imdbVotes.replace(/,/g, '')) : null,
                    metascore: omdbData.Metascore !== 'N/A' ? parseInt(omdbData.Metascore) : null,
                    box_office: omdbData.BoxOffice !== 'N/A' ? omdbData.BoxOffice : null,
                    awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
                    data_sources: { tmdb: true, omdb: true },
                    last_omdb_fetch: new Date().toISOString(),
                  })
                  .eq('id', movie.id);
                
                addLog(`✓ Enriched with OMDb: ${movie.title}`);
                
                // Track OMDb API usage
                const today = new Date().toISOString().split('T')[0];
                await supabase.rpc('increment_omdb_usage', { usage_date: today });
              }
            }
          }

          // 3. Check if poster download needed
          if (!movie.local_poster_url && movie.poster) {
            addLog(`Downloading poster for: ${movie.title}`);
            try {
              const posterResponse = await fetch(movie.poster);
              if (posterResponse.ok) {
                const posterBlob = await posterResponse.blob();
                const fileName = `${movie.imdb_id}.jpg`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('movie-posters')
                  .upload(fileName, posterBlob, { contentType: 'image/jpeg', upsert: true });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('movie-posters')
                    .getPublicUrl(fileName);

                  await supabase
                    .from('movies')
                    .update({ local_poster_url: urlData.publicUrl })
                    .eq('id', movie.id);
                  
                  addLog(`✓ Downloaded poster for: ${movie.title}`);
                }
              }
            } catch (posterError) {
              addLog(`⚠ Poster download failed for ${movie.title}: ${posterError}`);
            }
          }

        } catch (movieError) {
          failed++;
          addLog(`✗ Failed to process ${movie.title}: ${movieError}`);
        }
      }

      // CLEANUP PHASE: Remove movies that don't meet quality threshold after refresh
      addLog('Starting cleanup phase: checking all movies for quality compliance...');
      
      const { data: allMovies, error: fetchAllError } = await supabase
        .from('movies')
        .select('id, imdb_id, title, year, imdb_rating, rating, imdb_votes, vote_count');

      if (fetchAllError) {
        addLog(`⚠ Error fetching movies for cleanup: ${fetchAllError.message}`);
      } else if (allMovies) {
        addLog(`Checking ${allMovies.length} movies against quality threshold...`);
        
        for (const movie of allMovies) {
          // Prefer IMDB data, fallback to TMDB
          const effectiveRating = movie.imdb_rating || movie.rating || 0;
          const effectiveVotes = movie.imdb_votes || movie.vote_count || 0;
          
          const movieYear = movie.year || 0;
          const requiredVotes = getRequiredVoteCount(movieYear, DEFAULT_TIERS);

          // Check if movie fails quality threshold (below 6 stars OR below required votes for year)
          if (effectiveRating < 6.0 || effectiveVotes < requiredVotes) {
            const { error: deleteError } = await supabase
              .from('movies')
              .delete()
              .eq('id', movie.id);

            if (deleteError) {
              addLog(`✗ Error removing: "${movie.title}" - ${deleteError.message}`);
              failed++;
            } else {
              removed++;
              addLog(`✕ Removed: "${movie.title}" (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()}/${requiredVotes} for year ${movieYear})`);
            }
          }
        }
        
        addLog(`Cleanup complete: ${removed} movies removed for not meeting quality standards`);
      }

      // Update sync history with results
      await supabase
        .from('sync_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          imported,
          updated,
          failed,
          skipped,
          removed,
          logs,
        })
        .eq('id', syncHistory.id);

      addLog(`✓ Daily refresh pipeline completed: ${updated} updated, ${removed} removed, ${failed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          updated,
          failed,
          skipped,
          removed,
          logs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      // Update sync history with error
      await supabase
        .from('sync_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          imported,
          updated,
          failed,
          skipped,
          removed,
          logs,
        })
        .eq('id', syncHistory.id);

      throw error;
    }

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ CRITICAL ERROR in refresh-movies-pipeline');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
