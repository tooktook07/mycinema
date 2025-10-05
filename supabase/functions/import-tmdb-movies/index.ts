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
    let page = 1;
    let totalPages = 1;

    console.log("Starting to fetch 2025 movies with rating >= 6.9 from TMDB");

    // Fetch all pages of results
    while (page <= totalPages) {
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=2025&vote_average.gte=6.9&sort_by=vote_average.desc&page=${page}`
      );

      if (!tmdbResponse.ok) {
        throw new Error(`Failed to fetch from TMDB API: ${tmdbResponse.status}`);
      }

      const data = await tmdbResponse.json();
      totalPages = data.total_pages;
      totalMovies = data.total_results;

      console.log(`Processing page ${page} of ${totalPages}, found ${data.results.length} movies`);

      // Process each movie
      for (const movie of data.results) {
        // Fetch detailed movie info to get IMDB ID and additional data
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        );

        if (!detailsResponse.ok) {
          console.error(`Failed to fetch details for movie ${movie.id}`);
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
        const genres = details.genres?.map((g: any) => g.name) || [];

        // Convert runtime from minutes to "X min" format
        const runtime = details.runtime ? `${details.runtime} min` : null;

        // Insert/update movie in database
        const { error } = await supabaseClient
          .from("movies")
          .upsert({
            imdb_id: details.imdb_id || `tmdb_${details.id}`,
            title: details.title,
            year: parseInt(details.release_date?.split("-")[0] || "2025"),
            rating: details.vote_average || null,
            poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
            genres,
            plot: details.overview || null,
            director,
            actors,
            runtime,
          });

        if (error) {
          console.error(`Error inserting movie ${details.title}:`, error);
        } else {
          importedMovies++;
        }
      }

      page++;
    }

    console.log(`Import complete: ${importedMovies} movies imported out of ${totalMovies} found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalFound: totalMovies,
        imported: importedMovies,
        message: `Found ${totalMovies} movies from 2025 with rating >= 6.9. Imported ${importedMovies} into database.`
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
