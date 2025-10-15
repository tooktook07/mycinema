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

    let imported = 0, updated = 0, failed = 0, skipped = 0;

    try {
      const currentYear = new Date().getFullYear();
      addLog(`Fetching new releases for ${currentYear}`);

      // Fetch new releases from TMDB
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&primary_release_year=${currentYear}&sort_by=release_date.desc&page=1`
      );

      if (!tmdbResponse.ok) {
        throw new Error('Failed to fetch from TMDB');
      }

      const tmdbData = await tmdbResponse.json();
      const movies = tmdbData.results || [];
      addLog(`Found ${movies.length} new releases from TMDB`);

      for (const tmdbMovie of movies) {
        try {
          if (!tmdbMovie.id) {
            skipped++;
            continue;
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

          // Quality check - VERY lenient for new releases since they won't have many votes yet
          const tmdbRating = detailData.vote_average || 0;
          const tmdbVotes = detailData.vote_count || 0;

          // For new releases, only skip if BOTH sources have data AND both are below threshold
          // This allows movies with no ratings yet (brand new releases) to be imported
          const hasImdbData = imdbRating > 0 || imdbVotes > 0;
          const hasTmdbData = tmdbRating > 0 || tmdbVotes > 0;
          
          const failsImdb = hasImdbData && (imdbRating < 3.0 && imdbVotes > 100);
          const failsTmdb = hasTmdbData && (tmdbRating < 3.0 && tmdbVotes > 100);

          // Only skip if movie has votes AND is poorly rated on BOTH platforms
          if (failsImdb && failsTmdb) {
            addLog(`⊘ Below quality threshold: ${detailData.title} (IMDB: ${imdbRating}/10 [${imdbVotes.toLocaleString()} votes], TMDB: ${tmdbRating}/10 [${tmdbVotes.toLocaleString()} votes])`);
            skipped++;
            continue;
          }

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
          total_found: movies.length,
          logs,
        })
        .eq('id', syncHistory.id);

      addLog(`✓ New movies pipeline completed: ${imported} imported, ${skipped} skipped, ${failed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          updated,
          failed,
          skipped,
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
