import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoteTierConfig {
  currentYear: number;
  lastYear: number;
  twoToThreeYears: number;
  older: number;
}

function getRequiredVoteCount(movieYear: number, tiers: VoteTierConfig): number {
  const currentYear = new Date().getFullYear();
  const yearsDiff = currentYear - movieYear;
  
  if (yearsDiff === 0) return tiers.currentYear;
  if (yearsDiff === 1) return tiers.lastYear;
  if (yearsDiff >= 2 && yearsDiff <= 3) return tiers.twoToThreeYears;
  return tiers.older;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Capture client IP address for security logging
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  let syncId: string | undefined;

  try {
    // Parse and validate input parameters
    const body = await req.json();
    const minRating = typeof body.minRating === 'number' && body.minRating >= 0 && body.minRating <= 10 ? body.minRating : 0;
    const maxRating = typeof body.maxRating === 'number' && body.maxRating >= 0 && body.maxRating <= 10 && body.maxRating >= minRating ? body.maxRating : 10;
    const yearRange = Array.isArray(body.yearRange) && body.yearRange.length === 2 && 
                      typeof body.yearRange[0] === 'number' && typeof body.yearRange[1] === 'number' ? 
                      body.yearRange : [2025, 2025];
    const genres = Array.isArray(body.genres) ? body.genres.filter((g: any) => typeof g === 'string') : undefined;
    const excludedGenres = Array.isArray(body.excludedGenres) ? body.excludedGenres.filter((g: any) => typeof g === 'string') : undefined;
    const statuses = Array.isArray(body.statuses) ? body.statuses.filter((s: any) => typeof s === 'string') : undefined;
    const languages = Array.isArray(body.languages) ? body.languages.filter((l: any) => typeof l === 'string') : undefined;
    const voteTiers: VoteTierConfig = body.voteTiers || {
      currentYear: 300,
      lastYear: 500,
      twoToThreeYears: 750,
      older: 1000
    };
    const minPopularity = typeof body.minPopularity === 'number' && body.minPopularity >= 0 ? body.minPopularity : 0;
    const syncMode = typeof body.syncMode === 'boolean' ? body.syncMode : false;
    const maxPages = typeof body.maxPages === 'number' && body.maxPages >= 1 && body.maxPages <= 50 ? body.maxPages : 25;
    const trigger_source = body.trigger_source === 'automated' ? 'automated' : 'manual';
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

    // Initialize Supabase client with auth
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    if (!TMDB_API_KEY) {
      console.error("[INTERNAL] TMDB_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "Service temporarily unavailable",
        code: "SERVICE_ERROR" 
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Create sync history record
    const filters = {
      minRating,
      maxRating,
      yearRange,
      genres,
      excludedGenres,
      statuses,
      languages,
      voteTiers,
      minPopularity,
    };

    // Log the sync activity with IP address
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action_type: 'movie_sync_started',
        ip_address: clientIP,
        user_agent: userAgent,
        action_details: { sync_mode: syncMode, trigger_source, filters }
      });

    const { data: syncRecord, error: syncError } = await supabaseAdmin
      .from("sync_history")
      .insert({
        user_id: userId,
        sync_mode: syncMode,
        filters,
        status: "running",
        trigger_source,
      })
      .select()
      .single();

    if (syncError) {
      console.error("Error creating sync history:", syncError);
    }

    syncId = syncRecord?.id;

    const MAX_CONSECUTIVE_FAILURES = 5;
    const REQUEST_TIMEOUT = 30000; // 30 seconds
    const MAX_RETRIES = 3;
    const SAFE_TIMEOUT = 160000; // 160 seconds (safe margin before 180s CPU limit)
    let consecutiveFailures = 0;

    let totalMovies = 0;
    let importedMovies = 0;
    let updatedMovies = 0;
    let removedMovies = 0;
    let skippedMovies = 0;
    let failedMovies = 0;
    let page = 1;
    let totalPages = 1;
    const logs: string[] = [];
    const processedImdbIds = new Set<string>();
    const startTime = Date.now();

    const logMsg = (msg: string) => {
      console.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    const fetchWithTimeout = async (url: string, timeout: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    const fetchWithRetry = async (url: string, maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);

          // Check for rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * (i + 1);
            logMsg(`Rate limited, waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          if (!response.ok && response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }

          return response;
        } catch (error: any) {
          if (i === maxRetries - 1) throw error;

          const backoffTime = 1000 * Math.pow(2, i);
          logMsg(`Request failed, retrying in ${backoffTime}ms... (attempt ${i + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }

      throw new Error("Max retries exceeded");
    };

    // Helper function to download and store poster
    const downloadAndStorePoster = async (posterUrl: string, movieId: string, movieTitle: string): Promise<string | null> => {
      try {
        // Download poster from TMDB
        const posterResponse = await fetchWithTimeout(posterUrl, REQUEST_TIMEOUT);
        if (!posterResponse.ok) {
          logMsg(`  ⚠️ Failed to download poster for "${movieTitle}"`);
          return null;
        }

        const posterBlob = await posterResponse.arrayBuffer();
        const fileName = `${movieId}.jpg`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('movie-posters')
          .upload(fileName, posterBlob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          logMsg(`  ⚠️ Failed to upload poster for "${movieTitle}": ${uploadError.message}`);
          return null;
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('movie-posters')
          .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
      } catch (error: any) {
        logMsg(`  ⚠️ Error storing poster for "${movieTitle}": ${error.message}`);
        return null;
      }
    };

    logMsg(
      `Starting ${syncMode ? "sync" : "import"} with filters: ratingRange=${minRating}-${maxRating}, yearRange=${yearRange.join("-")}, genres=${genres?.join(",") || "all"}, excludedGenres=${excludedGenres?.join(",") || "none"}, languages=${languages?.join(",") || "all"}, statuses=${statuses?.join(",") || "all"}, voteTiers=current:${voteTiers.currentYear}/last:${voteTiers.lastYear}/2-3y:${voteTiers.twoToThreeYears}/older:${voteTiers.older}, minPopularity=${minPopularity}`,
    );

    // Get genre IDs from TMDB if genres or excludedGenres filter is specified
    let genreIds: number[] | undefined;
    let excludedGenreIds: number[] | undefined;
    if ((genres && genres.length > 0) || (excludedGenres && excludedGenres.length > 0)) {
      const genresResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`);
      const genresData = await genresResponse.json();

      if (genres && genres.length > 0) {
        genreIds = genresData.genres.filter((g: any) => genres.includes(g.name)).map((g: any) => g.id);
        logMsg(`Mapped included genres to IDs: ${genreIds?.join(",") || "none"}`);
      }

      if (excludedGenres && excludedGenres.length > 0) {
        excludedGenreIds = genresData.genres.filter((g: any) => excludedGenres.includes(g.name)).map((g: any) => g.id);
        logMsg(`Mapped excluded genres to IDs: ${excludedGenreIds?.join(",") || "none"}`);
      }
    }

    // Fetch pages up to maxPages limit to prevent timeout
    while (page <= Math.min(totalPages, maxPages)) {
      // Build query parameters - use the oldest/highest threshold for API query to avoid over-filtering
      const tmdbApiVoteThreshold = voteTiers.older; // Most restrictive
      let queryParams = `api_key=${TMDB_API_KEY}&primary_release_date.gte=${yearRange[0]}-01-01&primary_release_date.lte=${yearRange[1]}-12-31&vote_average.gte=${minRating}&vote_average.lte=${maxRating}&vote_count.gte=${tmdbApiVoteThreshold}&sort_by=vote_average.desc&page=${page}`;
      if (genreIds && genreIds.length > 0) {
        queryParams += `&with_genres=${genreIds.join(",")}`;
      }
      if (excludedGenreIds && excludedGenreIds.length > 0) {
        queryParams += `&without_genres=${excludedGenreIds.join(",")}`;
      }
      if (languages && languages.length > 0) {
        queryParams += `&with_original_language=${languages.join("|")}`;
      }

      // Note: TMDB API doesn't support popularity filtering directly in discover endpoint
      // We'll filter by popularity and status after fetching

      const tmdbResponse = await fetch(`https://api.themoviedb.org/3/discover/movie?${queryParams}`);

      if (!tmdbResponse.ok) {
        throw new Error(`Failed to fetch from TMDB API: ${tmdbResponse.status}`);
      }

      const data = await tmdbResponse.json();
      totalPages = data.total_pages;
      totalMovies = data.total_results;

      logMsg(`Processing page ${page} of ${Math.min(totalPages, maxPages)} (${totalPages} total), found ${data.results.length} movies`);

      // Check if we're approaching CPU timeout - exit gracefully
      if (Date.now() - startTime > SAFE_TIMEOUT) {
        logMsg(`⚠️ Approaching CPU timeout limit, stopping gracefully at page ${page}`);
        break;
      }

      // Process each movie
      for (const movie of data.results) {
        try {
          // Filter by popularity if specified
          if (minPopularity > 0 && movie.popularity < minPopularity) {
            continue;
          }
          
          // Get movie year for dynamic vote count check
          const movieYear = movie.release_date 
            ? parseInt(movie.release_date.split('-')[0]) 
            : yearRange[0];
          const requiredVotes = getRequiredVoteCount(movieYear, voteTiers);
          
          // Apply dynamic vote count filter
          if (movie.vote_count < requiredVotes) {
            logMsg(`⊘ Skipped: "${movie.title}" - insufficient votes (${movie.vote_count}/${requiredVotes} for ${movieYear})`);
            skippedMovies++;
            continue;
          }

          // Use TMDB ID as temporary identifier for checking existence
          const tempId = `tmdb_${movie.id}`;

          // Fetch detailed movie info with retry logic
          let detailsResponse;
          let details;

          try {
            detailsResponse = await fetchWithRetry(
              `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids,keywords,watch/providers,translations`,
              MAX_RETRIES,
            );

            if (!detailsResponse.ok) {
              throw new Error(`HTTP ${detailsResponse.status}`);
            }

            details = await detailsResponse.json();
            consecutiveFailures = 0; // Reset on success
          } catch (error: any) {
            consecutiveFailures++;
            logMsg(`✗ Failed to fetch details for: "${movie.title}" - ${error.message}`);
            failedMovies++;

            // Check if we should abort
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              const abortMsg = `Aborting sync: ${MAX_CONSECUTIVE_FAILURES} consecutive failures detected. Last error: ${error.message}`;
              logMsg(`🛑 ${abortMsg}`);

              // Update sync history and throw
              if (syncId) {
                await supabaseAdmin
                  .from("sync_history")
                  .update({
                    completed_at: new Date().toISOString(),
                    status: "failed",
                    error_message: abortMsg,
                    total_found: totalMovies,
                    imported: importedMovies,
                    updated: updatedMovies,
                    removed: removedMovies,
                    skipped: skippedMovies,
                    failed: failedMovies,
                    logs,
                  })
                  .eq("id", syncId);
              }

              throw new Error(abortMsg);
            }

            continue;
          }

          // Get actual IMDB ID from external_ids, fallback to tmdb_ prefix if not available
          const actualImdbId = details.external_ids?.imdb_id || tempId;

          // Check if movie already exists using either temp ID or actual IMDB ID
          const { data: existing } = await supabaseAdmin
            .from("movies")
            .select("*")
            .or(`imdb_id.eq.${tempId},imdb_id.eq.${actualImdbId}`)
            .maybeSingle();

          // Filter by status if specified
          if (statuses && statuses.length > 0 && !statuses.includes(details.status)) {
            logMsg(`⊘ Skipped: "${movie.title}" (status: ${details.status})`);
            skippedMovies++;
            continue;
          }

          // Get director from credits
          const director = details.credits?.crew?.find((person: any) => person.job === "Director")?.name || null;

          // Get top actors (cast)
          const actors =
            details.credits?.cast
              ?.slice(0, 10)
              .map((actor: any) => actor.name)
              .join(", ") || null;

          // Get writing credits
          const writing =
            details.credits?.crew
              ?.filter((person: any) => person.department === "Writing")
              .slice(0, 5)
              .map((person: any) => person.name)
              .join(", ") || null;

          // Get sound department
          const sound =
            details.credits?.crew
              ?.filter((person: any) => person.department === "Sound")
              .slice(0, 5)
              .map((person: any) => person.name)
              .join(", ") || null;

          // Get keywords
          const keywords = details.keywords?.keywords?.slice(0, 10).map((keyword: any) => keyword.name) || null;

          // Format genres
          const movieGenres = details.genres?.map((g: any) => g.name) || [];

          // Convert runtime from minutes to "X min" format
          const runtime = details.runtime ? `${details.runtime} min` : null;

          // Track this IMDB ID as processed
          processedImdbIds.add(actualImdbId);

          // Download and store poster if available
          const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
          let localPosterUrl = null;
          
          if (posterUrl) {
            localPosterUrl = await downloadAndStorePoster(posterUrl, actualImdbId, details.title);
          }

          const movieData = {
            imdb_id: actualImdbId,
            title: details.title,
            year: parseInt(details.release_date?.split("-")[0] || yearRange[0].toString()),
            rating: details.vote_average || null,
            vote_count: details.vote_count || null,
            popularity: details.popularity || null,
            poster: posterUrl,
            local_poster_url: localPosterUrl,
            genres: movieGenres,
            plot: details.overview || null,
            director,
            actors,
            runtime,
            original_language: details.original_language || null,
            tagline: details.tagline || null,
            status: details.status || null,
            writing,
            sound,
            keywords,
            production_companies: details.production_companies || null,
            production_countries: details.production_countries || null,
            spoken_languages: details.spoken_languages || null,
            budget: details.budget || null,
            revenue: details.revenue || null,
            watch_providers: details["watch/providers"] || null,
            translations: details.translations || null,
          };

          if (existing && syncMode) {
            // Update existing movie using its database ID
            const { error } = await supabaseAdmin.from("movies").update(movieData).eq("id", existing.id);

            if (error) {
              logMsg(`✗ Error updating: "${details.title}" - ${error.message}`);
              failedMovies++;
            } else {
              updatedMovies++;
              logMsg(`↻ Updated: "${details.title}" (${details.vote_average}/10)`);
            }
          } else if (existing) {
            // Skip if not in sync mode
            skippedMovies++;
            logMsg(`⊘ Skipped: "${details.title}" (already exists)`);
          } else {
            // Insert new movie
            const { error } = await supabaseAdmin.from("movies").insert(movieData);

            if (error) {
              logMsg(`✗ Error inserting: "${details.title}" - ${error.message}`);
              failedMovies++;
            } else {
              importedMovies++;
              logMsg(`✓ Imported: "${details.title}" (${details.vote_average}/10)`);
            }
          }
        } catch (error) {
          logMsg(`✗ Error processing movie: ${error instanceof Error ? error.message : "Unknown error"}`);
          failedMovies++;
        }
      }

      page++;
    }

    // Skip cleanup phase if approaching timeout to avoid CPU limit
    if (syncMode && Date.now() - startTime <= SAFE_TIMEOUT) {
      logMsg(`Checking for movies to remove that don't match current filters...`);

      // Get all movies from database
      const { data: allMovies, error: fetchError } = await supabaseAdmin
        .from("movies")
        .select("id, imdb_id, title, rating, vote_count, year, status, genres, original_language");

      if (fetchError) {
        logMsg(`✗ Error fetching movies for cleanup: ${fetchError.message}`);
      } else if (allMovies) {
        for (const movie of allMovies) {
          // Check timeout before processing each movie
          if (Date.now() - startTime > SAFE_TIMEOUT) {
            logMsg(`⚠️ Stopping cleanup early - approaching timeout limit`);
            break;
          }

          // Skip if this movie was just processed (it matches filters)
          if (processedImdbIds.has(movie.imdb_id)) {
            continue;
          }

          // Check if movie should be removed based on filters
          let shouldRemove = false;

          // Check rating
          if (movie.rating !== null && (movie.rating < minRating || movie.rating > maxRating)) {
            shouldRemove = true;
          }

          // Check vote count using dynamic tiers
          const movieYear = movie.year || yearRange[0];
          const requiredVotes = getRequiredVoteCount(movieYear, voteTiers);
          if (movie.vote_count !== null && movie.vote_count < requiredVotes) {
            shouldRemove = true;
          }

          // Check status
          if (statuses && statuses.length > 0 && movie.status && !statuses.includes(movie.status)) {
            shouldRemove = true;
          }

          // Check excluded genres
          if (excludedGenres && excludedGenres.length > 0 && movie.genres) {
            const hasExcludedGenre = movie.genres.some((g: string) => excludedGenres.includes(g));
            if (hasExcludedGenre) {
              shouldRemove = true;
            }
          }

          // Check language
          if (
            languages &&
            languages.length > 0 &&
            movie.original_language &&
            !languages.includes(movie.original_language)
          ) {
            shouldRemove = true;
          }

          if (shouldRemove) {
            const { error: deleteError } = await supabaseAdmin.from("movies").delete().eq("id", movie.id);

            if (deleteError) {
              logMsg(`✗ Error removing: "${movie.title}" - ${deleteError.message}`);
              failedMovies++;
            } else {
              removedMovies++;
              logMsg(`✕ Removed: "${movie.title}" (doesn't match filters)`);
            }
          }
        }
      }
    } else if (syncMode) {
      logMsg(`⚠️ Skipping cleanup phase - approaching timeout limit`);
    }

    const completionMsg = `${syncMode ? "Sync" : "Import"} complete: ${importedMovies} imported, ${updatedMovies} updated, ${removedMovies} removed, ${skippedMovies} skipped, ${failedMovies} failed. Processed ${page - 1} pages out of ${totalPages} total (found ${totalMovies} total movies).`;
    logMsg(completionMsg);

    if (page - 1 < totalPages) {
      logMsg(
        `⚠️ Only processed ${page - 1}/${totalPages} pages due to maxPages limit (${maxPages}). Run sync again to process more pages.`,
      );
    }

    // Update sync history with results
    if (syncId) {
      await supabaseAdmin
        .from("sync_history")
        .update({
          completed_at: new Date().toISOString(),
          total_found: totalMovies,
          imported: importedMovies,
          updated: updatedMovies,
          removed: removedMovies,
          skipped: skippedMovies,
          failed: failedMovies,
          logs,
          status: "completed",
        })
        .eq("id", syncId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFound: totalMovies,
        imported: importedMovies,
        updated: updatedMovies,
        removed: removedMovies,
        skipped: skippedMovies,
        failed: failedMovies,
        logs,
        pagesProcessed: page - 1,
        totalPages,
        hasMorePages: page - 1 < totalPages,
        message: syncMode
          ? `Sync complete: ${importedMovies} imported, ${updatedMovies} updated, ${removedMovies} removed, ${skippedMovies} skipped, ${failedMovies} failed. Processed ${page - 1}/${totalPages} pages.${page - 1 < totalPages ? " Run sync again to process more." : ""}`
          : `Found ${totalMovies} movies. Imported ${importedMovies}, skipped ${skippedMovies} existing, ${failedMovies} failed. Processed ${page - 1}/${totalPages} pages.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in import-tmdb-movies function:", error);

    // Update sync history with error if we have a sync ID
    if (syncId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabaseAdmin
        .from("sync_history")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", syncId);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
