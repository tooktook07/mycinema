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
    const { imdbId, type } = await req.json(); // type: 'movie' or 'series'
    const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY");

    if (!OMDB_API_KEY) {
      console.error("OMDB_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "OMDB API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch data from OMDB API
    console.log("Fetching data for IMDB ID:", imdbId);
    const omdbResponse = await fetch(
      `http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}&plot=full`
    );

    if (!omdbResponse.ok) {
      throw new Error("Failed to fetch from OMDB API");
    }

    const movieData = await omdbResponse.json();

    if (movieData.Response === "False") {
      return new Response(
        JSON.stringify({ error: movieData.Error || "Movie not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Format genres as array
    const genres = movieData.Genre ? movieData.Genre.split(", ") : [];

    if (type === "movie" || movieData.Type === "movie") {
      // Insert/update movie
      const { data, error } = await supabaseClient
        .from("movies")
        .upsert({
          imdb_id: movieData.imdbID,
          title: movieData.Title,
          year: parseInt(movieData.Year),
          rating: parseFloat(movieData.imdbRating) || null,
          poster: movieData.Poster !== "N/A" ? movieData.Poster : null,
          genres,
          plot: movieData.Plot !== "N/A" ? movieData.Plot : null,
          director: movieData.Director !== "N/A" ? movieData.Director : null,
          actors: movieData.Actors !== "N/A" ? movieData.Actors : null,
          runtime: movieData.Runtime !== "N/A" ? movieData.Runtime : null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting movie:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data, type: "movie" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Insert/update TV show
      const startYear = parseInt(movieData.Year.split("–")[0]);
      const endYear = movieData.Year.includes("–")
        ? movieData.Year.split("–")[1]
          ? parseInt(movieData.Year.split("–")[1])
          : null
        : startYear;

      const { data, error } = await supabaseClient
        .from("tv_shows")
        .upsert({
          imdb_id: movieData.imdbID,
          title: movieData.Title,
          start_year: startYear,
          end_year: endYear,
          rating: parseFloat(movieData.imdbRating) || null,
          poster: movieData.Poster !== "N/A" ? movieData.Poster : null,
          genres,
          plot: movieData.Plot !== "N/A" ? movieData.Plot : null,
          seasons: parseInt(movieData.totalSeasons) || null,
          episodes: null, // OMDB doesn't provide total episodes
          season_dates: null, // Would need additional API calls per season
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting TV show:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data, type: "series" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in fetch-movie-data function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
