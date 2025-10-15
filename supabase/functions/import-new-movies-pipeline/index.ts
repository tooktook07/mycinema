import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      console.log('🤖 Automated execution via service role');
      const { data: adminUser, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (adminError || !adminUser) {
        return new Response(JSON.stringify({ error: 'No admin user found for automated execution' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = adminUser.user_id;
    } else {
      // Manual call - verify user is admin
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      userId = user.id;
    }

    const logs: string[] = [];
    const addLog = (message: string) => {
      console.log(message);
      logs.push(`${new Date().toISOString()}: ${message}`);
    };

    addLog(isServiceRole ? '🤖 Starting new movies import pipeline (automated)' : '✨ Starting new movies import pipeline (manual)');

    // Create sync history record
    const { data: syncHistory, error: syncError } = await supabase
      .from('sync_history')
      .insert({
        sync_type: 'new_imports',
        trigger_source: isServiceRole ? 'automated' : 'manual',
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
      // Calculate date range: last 60 days
      const today = new Date();
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(today.getDate() - 60);
      
      const todayStr = today.toISOString().split('T')[0];
      const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];
      
      addLog(`Fetching movies released between ${sixtyDaysAgoStr} and ${todayStr}`);

      let allMovies: any[] = [];
      
      // Fetch multiple pages to get more variety
      for (let page = 1; page <= 5; page++) {
        try {
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&release_date.gte=${sixtyDaysAgoStr}&release_date.lte=${todayStr}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`
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

          // Get detailed movie data including IMDb ID
          const detailResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${tmdbApiKey}&append_to_response=external_ids,keywords,credits`
          );

          if (!detailResponse.ok) {
            skipped++;
            continue;
          }

          const detailData = await detailResponse.json();
          const imdbId = detailData.external_ids?.imdb_id;

          if (!imdbId) {
            addLog(`⚠ No IMDb ID for: ${detailData.title}`);
            
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

          // Check if movie already exists
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('id')
            .eq('imdb_id', imdbId)
            .single();

          if (existingMovie) {
            addLog(`⊘ Movie already exists: ${detailData.title}`);
            
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

          // Quality check - 6+ stars and 1000+ votes (IMDB or TMDB fallback)
          const tmdbRating = detailData.vote_average || 0;
          const tmdbVotes = detailData.vote_count || 0;

          // Prefer IMDB data, fallback to TMDB
          const effectiveRating = imdbRating > 0 ? imdbRating : tmdbRating;
          const effectiveVotes = imdbVotes > 0 ? imdbVotes : tmdbVotes;

          // Must meet BOTH thresholds (6+ stars AND 1000+ votes)
          if (effectiveRating < 6.0 || effectiveVotes < 1000) {
            addLog(`⊘ Below quality threshold: ${detailData.title} (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()})`);
            
            // Record that we checked this movie (will retry after 30 days)
            await supabase.from('tmdb_processed_movies').upsert({
              tmdb_id: tmdbMovie.id,
              import_status: 'skipped_quality',
              skip_reason: `Below threshold - Rating: ${effectiveRating}/10, Votes: ${effectiveVotes}`,
              checked_at: new Date().toISOString()
            });
            
            skipped++;
            continue;
          }

          addLog(`✓ Meets quality threshold: ${detailData.title} (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()})`);

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
      
      const { data: existingMovies, error: fetchError } = await supabase
        .from('movies')
        .select('id, imdb_id, title, imdb_rating, rating, imdb_votes, vote_count');

      if (fetchError) {
        addLog(`⚠ Error fetching movies for cleanup: ${fetchError.message}`);
      } else if (existingMovies) {
        addLog(`Checking ${existingMovies.length} movies against quality threshold...`);
        
        for (const movie of existingMovies) {
          // Prefer IMDB data, fallback to TMDB
          const effectiveRating = movie.imdb_rating || movie.rating || 0;
          const effectiveVotes = movie.imdb_votes || movie.vote_count || 0;

          // Check if movie fails quality threshold (below 6 stars OR below 1000 votes)
          if (effectiveRating < 6.0 || effectiveVotes < 1000) {
            const { error: deleteError } = await supabase
              .from('movies')
              .delete()
              .eq('id', movie.id);

            if (deleteError) {
              addLog(`✗ Error removing: "${movie.title}" - ${deleteError.message}`);
              failed++;
            } else {
              removed++;
              addLog(`✕ Removed: "${movie.title}" (Rating: ${effectiveRating}/10, Votes: ${effectiveVotes.toLocaleString()})`);
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
    console.error('Error in import-new-movies-pipeline:', error);
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
