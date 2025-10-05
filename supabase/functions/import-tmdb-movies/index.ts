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
    const { minRating = 0, maxRating = 10, yearRange = [2025, 2025], genres, excludedGenres, statuses, languages, minVoteCount = 100, minPopularity = 0, syncMode = false } = await req.json();
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

    if (!TMDB_API_KEY) {
      console.error("TMDB_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const logMsg = (msg: string) => {
      console.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    logMsg(`Starting ${syncMode ? 'sync' : 'import'} with filters: ratingRange=${minRating}-${maxRating}, yearRange=${yearRange.join('-')}, genres=${genres?.join(',') || 'all'}, excludedGenres=${excludedGenres?.join(',') || 'none'}, languages=${languages?.join(',') || 'all'}, statuses=${statuses?.join(',') || 'all'}, minVoteCount=${minVoteCount}+, minPopularity=${minPopularity}`);

    // Get genre IDs from TMDB if genres or excludedGenres filter is specified
    let genreIds: number[] | undefined;
    let excludedGenreIds: number[] | undefined;
    if ((genres && genres.length > 0) || (excludedGenres && excludedGenres.length > 0)) {
      const genresResponse = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`
      );
      const genresData = await genresResponse.json();
      
      if (genres && genres.length > 0) {
        genreIds = genresData.genres
          .filter((g: any) => genres.includes(g.name))
          .map((g: any) => g.id);
        logMsg(`Mapped included genres to IDs: ${genreIds?.join(',') || 'none'}`);
      }
      
      if (excludedGenres && excludedGenres.length > 0) {
        excludedGenreIds = genresData.genres
          .filter((g: any) => excludedGenres.includes(g.name))
          .map((g: any) => g.id);
        logMsg(`Mapped excluded genres to IDs: ${excludedGenreIds?.join(',') || 'none'}`);
      }
    }

    // Fetch all pages of results
    while (page <= totalPages) {
      // Build query parameters
      let queryParams = `api_key=${TMDB_API_KEY}&primary_release_date.gte=${yearRange[0]}-01-01&primary_release_date.lte=${yearRange[1]}-12-31&vote_average.gte=${minRating}&vote_average.lte=${maxRating}&vote_count.gte=${minVoteCount}&sort_by=vote_average.desc&page=${page}`;
      if (genreIds && genreIds.length > 0) {
        queryParams += `&with_genres=${genreIds.join(',')}`;
      }
      if (excludedGenreIds && excludedGenreIds.length > 0) {
        queryParams += `&without_genres=${excludedGenreIds.join(',')}`;
      }
      if (languages && languages.length > 0) {
        queryParams += `&with_original_language=${languages.join('|')}`;
      }
      
      // Note: TMDB API doesn't support popularity filtering directly in discover endpoint
      // We'll filter by popularity and status after fetching

      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/discover/movie?${queryParams}`
      );

      if (!tmdbResponse.ok) {
        throw new Error(`Failed to fetch from TMDB API: ${tmdbResponse.status}`);
      }

      const data = await tmdbResponse.json();
      totalPages = data.total_pages;
      totalMovies = data.total_results;

      logMsg(`Processing page ${page} of ${totalPages}, found ${data.results.length} movies`);

      // Process each movie
      for (const movie of data.results) {
        try {
          // Filter by popularity if specified
          if (minPopularity > 0 && movie.popularity < minPopularity) {
            continue;
          }

          // Use TMDB ID as temporary identifier for checking existence
          const tempId = `tmdb_${movie.id}`;
          
          const { data: existing } = await supabaseClient
            .from("movies")
            .select("*")
            .eq("imdb_id", tempId)
            .maybeSingle();

          // Fetch detailed movie info to get additional data including IMDB ID
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`
          );

          if (!detailsResponse.ok) {
            logMsg(`✗ Failed to fetch details for: "${movie.title}"`);
            failedMovies++;
            continue;
          }

          const details = await detailsResponse.json();
          
          // Get actual IMDB ID from external_ids, fallback to tmdb_ prefix if not available
          const actualImdbId = details.external_ids?.imdb_id || `tmdb_${movie.id}`;

          // Filter by status if specified
          if (statuses && statuses.length > 0 && !statuses.includes(details.status)) {
            logMsg(`⊘ Skipped: "${movie.title}" (status: ${details.status})`);
            skippedMovies++;
            continue;
          }

          // Get director from credits
          const director = details.credits?.crew?.find((person: any) => person.job === "Director")?.name || null;

          // Get top actors
          const actors = details.credits?.cast
            ?.slice(0, 5)
            .map((actor: any) => actor.name)
            .join(", ") || null;

          // Format genres
          const movieGenres = details.genres?.map((g: any) => g.name) || [];

          // Convert runtime from minutes to "X min" format
          const runtime = details.runtime ? `${details.runtime} min` : null;

          // Track this IMDB ID as processed
          processedImdbIds.add(actualImdbId);

          const movieData = {
            imdb_id: actualImdbId,
            title: details.title,
            year: parseInt(details.release_date?.split("-")[0] || yearRange[0].toString()),
            rating: details.vote_average || null,
            vote_count: details.vote_count || null,
            popularity: details.popularity || null,
            poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
            genres: movieGenres,
            plot: details.overview || null,
            director,
            actors,
            runtime,
            original_language: details.original_language || null,
            tagline: details.tagline || null,
            status: details.status || null,
          };

          if (existing && syncMode) {
            // Update existing movie
            const { error } = await supabaseClient
              .from("movies")
              .update(movieData)
              .eq("imdb_id", tempId);

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
            const { error } = await supabaseClient
              .from("movies")
              .insert(movieData);

            if (error) {
              logMsg(`✗ Error inserting: "${details.title}" - ${error.message}`);
              failedMovies++;
            } else {
              importedMovies++;
              logMsg(`✓ Imported: "${details.title}" (${details.vote_average}/10)`);
            }
          }
        } catch (error) {
          logMsg(`✗ Error processing movie: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedMovies++;
        }
      }

      page++;
    }

    // Remove movies that don't match filters anymore (only in sync mode)
    if (syncMode) {
      logMsg(`Checking for movies to remove that don't match current filters...`);
      
      // Get all movies from database
      const { data: allMovies, error: fetchError } = await supabaseClient
        .from("movies")
        .select("id, imdb_id, title, rating, vote_count, status, genres, original_language");

      if (fetchError) {
        logMsg(`✗ Error fetching movies for cleanup: ${fetchError.message}`);
      } else if (allMovies) {
        for (const movie of allMovies) {
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

          // Check vote count
          if (movie.vote_count !== null && movie.vote_count < minVoteCount) {
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
          if (languages && languages.length > 0 && movie.original_language && !languages.includes(movie.original_language)) {
            shouldRemove = true;
          }

          if (shouldRemove) {
            const { error: deleteError } = await supabaseClient
              .from("movies")
              .delete()
              .eq("id", movie.id);

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
    }

    logMsg(`${syncMode ? 'Sync' : 'Import'} complete: ${importedMovies} imported, ${updatedMovies} updated, ${removedMovies} removed, ${skippedMovies} skipped, ${failedMovies} failed out of ${totalMovies} found`);

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
        message: syncMode 
          ? `Sync complete: ${importedMovies} imported, ${updatedMovies} updated, ${removedMovies} removed, ${skippedMovies} skipped, ${failedMovies} failed.`
          : `Found ${totalMovies} movies. Imported ${importedMovies}, skipped ${skippedMovies} existing, ${failedMovies} failed.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in import-tmdb-movies function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
