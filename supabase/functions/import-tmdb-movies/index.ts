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
    const { minRating = 6.9, yearRange = [2025, 2025], genres } = await req.json();
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
    let skippedMovies = 0;
    let failedMovies = 0;
    let page = 1;
    let totalPages = 1;
    const logs: string[] = [];

    const logMsg = (msg: string) => {
      console.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    logMsg(`Starting import with filters: minRating=${minRating}, yearRange=${yearRange.join('-')}, genres=${genres?.join(',') || 'all'}`);

    // Get genre IDs from TMDB if genres filter is specified
    let genreIds: number[] | undefined;
    if (genres && genres.length > 0) {
      const genresResponse = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`
      );
      const genresData = await genresResponse.json();
      genreIds = genresData.genres
        .filter((g: any) => genres.includes(g.name))
        .map((g: any) => g.id);
      logMsg(`Mapped genres to IDs: ${genreIds?.join(',') || 'none'}`);
    }

    // Fetch all pages of results
    while (page <= totalPages) {
      // Build query parameters
      let queryParams = `api_key=${TMDB_API_KEY}&primary_release_date.gte=${yearRange[0]}-01-01&primary_release_date.lte=${yearRange[1]}-12-31&vote_average.gte=${minRating}&sort_by=vote_average.desc&page=${page}`;
      if (genreIds && genreIds.length > 0) {
        queryParams += `&with_genres=${genreIds.join(',')}`;
      }

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
          // Check if movie already exists
          const imdbId = `tmdb_${movie.id}`;
          const { data: existing } = await supabaseClient
            .from("movies")
            .select("imdb_id")
            .eq("imdb_id", imdbId)
            .single();

          if (existing) {
            skippedMovies++;
            logMsg(`⊘ Skipped: "${movie.title}" (already exists)`);
            continue;
          }

          // Fetch detailed movie info to get additional data
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
          );

          if (!detailsResponse.ok) {
            logMsg(`✗ Failed to fetch details for: "${movie.title}"`);
            failedMovies++;
            continue;
          }

          const details = await detailsResponse.json();

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

          // Insert movie in database
          const { error } = await supabaseClient
            .from("movies")
            .insert({
              imdb_id: imdbId,
              title: details.title,
              year: parseInt(details.release_date?.split("-")[0] || yearRange[0].toString()),
              rating: details.vote_average || null,
              poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
              genres: movieGenres,
              plot: details.overview || null,
              director,
              actors,
              runtime,
            });

          if (error) {
            logMsg(`✗ Error inserting: "${details.title}" - ${error.message}`);
            failedMovies++;
          } else {
            importedMovies++;
            logMsg(`✓ Imported: "${details.title}" (${details.vote_average}/10)`);
          }
        } catch (error) {
          logMsg(`✗ Error processing movie: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedMovies++;
        }
      }

      page++;
    }

    logMsg(`Import complete: ${importedMovies} imported, ${skippedMovies} skipped, ${failedMovies} failed out of ${totalMovies} found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalFound: totalMovies,
        imported: importedMovies,
        skipped: skippedMovies,
        failed: failedMovies,
        logs,
        message: `Found ${totalMovies} movies. Imported ${importedMovies}, skipped ${skippedMovies} existing, ${failedMovies} failed.`
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
