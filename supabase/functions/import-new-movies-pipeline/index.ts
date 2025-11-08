/**
 * IMPORT NEW MOVIES PIPELINE v2.1
 * 
 * AUTHENTICATION FLOW:
 * - Automated (cron): Uses service role key → finds first admin user → runs as that admin
 * - Manual (UI): Uses user JWT → verifies admin role → runs as that user
 * 
 * REQUIREMENTS:
 * - At least one user with 'admin' role must exist in user_roles table
 * - Service role key must be valid
 * - TMDB API key configured
 * - OMDb API key configured
 * 
 * FUNCTIONALITY:
 * - Imports movies from last 3 years (5 pages from TMDB, catches "sleeper hits")
 * - Applies quality filter: 6+ stars AND 1000+ votes
 * - Fetches OMDb data before inserting
 * - Downloads posters immediately
 * - Tracks processed movies to avoid duplicates
 * - Removes existing movies below quality threshold
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
  console.log('✨ FUNCTION BOOT: import-new-movies-pipeline');
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
  console.log('✨ NEW MOVIES IMPORT PIPELINE STARTED');
  console.log(`📍 Client: ${clientIP}`);
  console.log(`🌐 User Agent: ${userAgent}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')!;
    const omdbApiKey = Deno.env.get('OMDB_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Webhook secret authentication for automated cron jobs
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string;

    if (cronSecret) {
      // Automated cron job - validate webhook secret
      const expectedSecret = Deno.env.get('CRON_SECRET');
      if (!expectedSecret || cronSecret !== expectedSecret) {
        console.error('❌ Invalid webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('🤖 AUTOMATED EXECUTION via webhook secret');
      // Use first admin user for automated execution
      const { data: adminUser, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError || !adminUser) {
        console.error('❌ CRITICAL: No admin user found for automated execution');
        return new Response(JSON.stringify({ error: 'No admin user found' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`✅ Using admin user: ${adminUser.user_id}`);
      userId = adminUser.user_id;
    } else if (authHeader) {
      // Manual call - verify user JWT and admin role
      console.log('👤 MANUAL EXECUTION via user JWT');
      const token = authHeader.replace('Bearer ', '');
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
    } else {
      // No authentication provided
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAutomated = !!cronSecret;
    const logs: string[] = [];
    const addLog = (message: string) => {
      console.log(message);
      logs.push(`${new Date().toISOString()}: ${message}`);
    };

    addLog(isAutomated ? '🤖 Starting new movies import pipeline (automated)' : '✨ Starting new movies import pipeline (manual)');

    // Create sync history record
    const { data: syncHistory, error: syncError } = await supabase
      .from('sync_history')
      .insert({
        sync_type: 'new_imports',
        trigger_source: isAutomated ? 'automated' : 'manual',
        user_id: userId,
        status: 'running',
      })
      .select()
      .single();

    if (syncError || !syncHistory) {
      throw new Error(`Failed to create sync history: ${syncError?.message}`);
    }

    let imported = 0, updated = 0, failed = 0, skipped = 0, removed = 0, alreadyChecked = 0;

    try {
      // Calculate date range: last 3 years (to catch "sleeper hits")
      const today = new Date();
      const threeYearsAgo = new Date(today);
      threeYearsAgo.setDate(today.getDate() - (3 * 365));
      
      const todayStr = today.toISOString().split('T')[0];
      const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];
      
      addLog(`Fetching movies released between ${threeYearsAgoStr} and ${todayStr}`);

      let allMovies: any[] = [];
      
      // Fetch 15 pages to get more variety (increased from 5 to ~300 movies/day)
      for (let page = 1; page <= 15; page++) {
        try {
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&release_date.gte=${threeYearsAgoStr}&release_date.lte=${todayStr}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`
          );

          if (!tmdbResponse.ok) {
            addLog(`⚠ Failed to fetch page ${page} from TMDB`);
            continue;
          }

          const tmdbData = await tmdbResponse.json();
          const pageMovies = tmdbData.results || [];
          allMovies = allMovies.concat(pageMovies);
          
          addLog(`Fetched ${pageMovies.length} movies from page ${page}`);
          
          // Small delay to respect TMDB rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (pageError) {
          addLog(`⚠ Error fetching page ${page}: ${pageError}`);
        }
      }
      
      const movies = allMovies;
      addLog(`Total found: ${movies.length} movies from TMDB`);
      
      // DEDUPLICATION: Fetch all existing IMDb IDs to avoid expensive API calls
      addLog('Fetching existing movie IMDb IDs for deduplication...');
      const { data: existingMovies, error: existingError } = await supabase
        .from('movies')
        .select('imdb_id');
      
      if (existingError) {
        addLog(`⚠ Error fetching existing movies: ${existingError.message}`);
      }
      
      const existingImdbIds = new Set(
        (existingMovies || []).map(m => m.imdb_id).filter(Boolean)
      );
      addLog(`Loaded ${existingImdbIds.size} existing IMDb IDs for quick deduplication`);

      for (const tmdbMovie of movies) {
        try {
          if (!tmdbMovie.id) {
            skipped++;
            continue;
          }

          // Check if this TMDB movie was already processed recently
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: processed } = await supabase
            .from('tmdb_processed_movies')
            .select('import_status, checked_at')
            .eq('tmdb_id', tmdbMovie.id)
            .gte('checked_at', thirtyDaysAgo)
            .single();

          if (processed) {
            // If it was recently checked and not imported, skip it (will retry after 30 days)
            if (processed.import_status !== 'imported') {
              alreadyChecked++;
              continue;
            }
          }

          // DEDUPLICATION STEP 1: Fetch ONLY external IDs (lightweight call)
          const externalIdsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}/external_ids?api_key=${tmdbApiKey}`
          );

          if (!externalIdsResponse.ok) {
            skipped++;
            continue;
          }

          const externalIds = await externalIdsResponse.json();
          const imdbId = externalIds.imdb_id;

          if (!imdbId) {
            // Record that we checked this movie
            await supabase.from('tmdb_processed_movies').upsert({
              tmdb_id: tmdbMovie.id,
              import_status: 'skipped_no_imdb',
              skip_reason: 'No IMDb ID found in TMDB data',
              checked_at: new Date().toISOString()
            });
            
            skipped++;
            continue;
          }

          // DEDUPLICATION STEP 2: Check against pre-fetched IMDb IDs (instant)
          if (existingImdbIds.has(imdbId)) {
            // Record that we checked this movie
            await supabase.from('tmdb_processed_movies').upsert({
              tmdb_id: tmdbMovie.id,
              import_status: 'skipped_duplicate',
              skip_reason: `Already exists with IMDb ID: ${imdbId}`,
              checked_at: new Date().toISOString()
            });
            
            skipped++;
            continue;
          }

          // NOW fetch full details (only for movies that don't exist)
          const detailResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${tmdbApiKey}&append_to_response=keywords,credits`
          );

          if (!detailResponse.ok) {
            skipped++;
            continue;
          }

          const detailData = await detailResponse.json();

          // Fetch OMDb data BEFORE inserting to apply quality filters
          let omdbData: any = null;
          let imdbRating = 0;
          let imdbVotes = 0;
          
          try {
            const omdbResponse = await fetch(
              `http://www.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}&plot=full`
            );

            if (omdbResponse.ok) {
              omdbData = await omdbResponse.json();
              
              if (omdbData.Response === 'True') {
                imdbRating = omdbData.imdbRating && omdbData.imdbRating !== 'N/A' 
                  ? parseFloat(omdbData.imdbRating) 
                  : 0;
                imdbVotes = omdbData.imdbVotes && omdbData.imdbVotes !== 'N/A'
                  ? parseInt(omdbData.imdbVotes.replace(/,/g, ''))
                  : 0;
                
                // Track OMDb API usage
                const today = new Date().toISOString().split('T')[0];
                await supabase.rpc('increment_omdb_usage', { usage_date: today });
              }
            }
          } catch (omdbError) {
            addLog(`⚠ OMDb fetch failed for ${detailData.title}: ${omdbError}`);
          }

          // Quality check - 6+ stars and dynamic vote threshold based on year
          const tmdbRating = detailData.vote_average || 0;
          const tmdbVotes = detailData.vote_count || 0;

          // Prefer IMDB data, fallback to TMDB
          const effectiveRating = imdbRating > 0 ? imdbRating : tmdbRating;
          const effectiveVotes = imdbVotes > 0 ? imdbVotes : tmdbVotes;

          // Get required votes based on movie year
          const movieYear = detailData.release_date 
            ? parseInt(detailData.release_date.split('-')[0]) 
            : 0;
          const requiredVotes = getRequiredVoteCount(movieYear, DEFAULT_TIERS);

          // Must meet BOTH thresholds (6+ stars AND required votes for year)
          if (effectiveRating < 6.0 || effectiveVotes < requiredVotes) {
            addLog(`⊘ Below quality threshold: ${detailData.title} (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()}, Required: ${requiredVotes} for ${movieYear})`);
            
            // Record that we checked this movie (will retry after 30 days)
            await supabase.from('tmdb_processed_movies').upsert({
              tmdb_id: tmdbMovie.id,
              import_status: 'skipped_quality',
              skip_reason: `Below threshold - Rating: ${effectiveRating}/10, Votes: ${effectiveVotes}/${requiredVotes} for year ${movieYear}`,
              checked_at: new Date().toISOString()
            });
            
            skipped++;
            continue;
          }

          addLog(`✓ Meets quality threshold: ${detailData.title} (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()}/${requiredVotes} for ${movieYear})`);

          addLog(`Importing: ${detailData.title} (IMDB: ${imdbRating}/10, TMDB: ${tmdbRating}/10)`);

          // Prepare movie data with both TMDB and IMDB data
          const posterUrl = detailData.poster_path
            ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}`
            : null;

          const movieData = {
            imdb_id: imdbId,
            title: detailData.title,
            year: new Date(detailData.release_date).getFullYear(),
            rating: detailData.vote_average,
            vote_count: detailData.vote_count,
            popularity: detailData.popularity,
            genres: detailData.genres?.map((g: any) => g.name) || [],
            plot: detailData.overview,
            poster: posterUrl,
            runtime: detailData.runtime ? `${detailData.runtime} min` : null,
            director: detailData.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
            actors: detailData.credits?.cast?.slice(0, 5).map((a: any) => a.name).join(', '),
            keywords: detailData.keywords?.keywords?.map((k: any) => k.name) || [],
            original_language: detailData.original_language,
            budget: detailData.budget || null,
            revenue: detailData.revenue || null,
            tagline: detailData.tagline,
            status: detailData.status,
            production_companies: detailData.production_companies || [],
            production_countries: detailData.production_countries || [],
            spoken_languages: detailData.spoken_languages || [],
            // Include IMDB data from OMDb
            imdb_rating: imdbRating > 0 ? imdbRating : null,
            imdb_votes: imdbVotes > 0 ? imdbVotes : null,
            metascore: omdbData?.Metascore && omdbData.Metascore !== 'N/A' ? parseInt(omdbData.Metascore) : null,
            box_office: omdbData?.BoxOffice && omdbData.BoxOffice !== 'N/A' ? omdbData.BoxOffice : null,
            awards: omdbData?.Awards && omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
            data_sources: { tmdb: true, omdb: omdbData?.Response === 'True' },
            last_omdb_fetch: omdbData?.Response === 'True' ? new Date().toISOString() : null,
          };

          // Insert movie with both TMDB and IMDB data
          const { data: newMovie, error: insertError } = await supabase
            .from('movies')
            .insert(movieData)
            .select()
            .single();

          if (insertError) {
            addLog(`✗ Failed to insert ${detailData.title}: ${insertError.message}`);
            failed++;
            continue;
          }

          imported++;
          addLog(`✓ Imported: ${detailData.title}`);
          
          // Record successful import
          await supabase.from('tmdb_processed_movies').upsert({
            tmdb_id: tmdbMovie.id,
            import_status: 'imported',
            skip_reason: null,
            checked_at: new Date().toISOString()
          });

          // Immediately download poster
          if (posterUrl) {
            try {
              addLog(`Downloading poster for: ${detailData.title}`);
              const posterResponse = await fetch(posterUrl);
              
              if (posterResponse.ok) {
                const posterBlob = await posterResponse.blob();
                const fileName = `${imdbId}.jpg`;

                const { error: uploadError } = await supabase.storage
                  .from('movie-posters')
                  .upload(fileName, posterBlob, { contentType: 'image/jpeg', upsert: true });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('movie-posters')
                    .getPublicUrl(fileName);

                  await supabase
                    .from('movies')
                    .update({ local_poster_url: urlData.publicUrl })
                    .eq('id', newMovie.id);

                  addLog(`✓ Downloaded poster for: ${detailData.title}`);
                }
              }
            } catch (posterError) {
              addLog(`⚠ Poster download failed for ${detailData.title}: ${posterError}`);
            }
          }

          // Small delay to respect TMDB rate limits
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (movieError) {
          failed++;
          addLog(`✗ Failed to process movie: ${movieError}`);
        }
      }

      // CLEANUP PHASE: Remove existing movies that don't meet quality threshold
      addLog('Starting cleanup phase: checking existing movies for quality compliance...');
      
      const { data: allExistingMovies, error: fetchError } = await supabase
        .from('movies')
        .select('id, imdb_id, title, imdb_rating, rating, imdb_votes, vote_count');

      if (fetchError) {
        addLog(`⚠ Error fetching movies for cleanup: ${fetchError.message}`);
      } else if (allExistingMovies) {
        addLog(`Checking ${allExistingMovies.length} movies against quality threshold...`);
        
        for (const movie of allExistingMovies) {
          // Prefer IMDB data, fallback to TMDB
          const effectiveRating = movie.imdb_rating || movie.rating || 0;
          const effectiveVotes = movie.imdb_votes || movie.vote_count || 0;
          
          // Get the year from the movie record
          const { data: movieData } = await supabase
            .from('movies')
            .select('year')
            .eq('id', movie.id)
            .single();
          
          const movieYear = movieData?.year || 0;
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
          total_found: movies.length,
          logs,
        })
        .eq('id', syncHistory.id);

      addLog(`✓ New movies pipeline completed: ${imported} imported, ${removed} removed, ${skipped} skipped, ${alreadyChecked} already checked, ${failed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          updated,
          failed,
          skipped,
          removed,
          alreadyChecked,
          total_found: movies.length,
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
    console.error('❌ CRITICAL ERROR in import-new-movies-pipeline');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
