import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

function getRequiredVoteCount(movieYear: number, tiers: VoteTierConfig): number {
  const currentYear = new Date().getFullYear();
  const yearsDiff = currentYear - movieYear;
  
  if (yearsDiff === 0) return tiers.currentYear;
  if (yearsDiff === 1) return tiers.lastYear;
  if (yearsDiff >= 2 && yearsDiff <= 3) return tiers.twoToThreeYears;
  return tiers.older;
}

function getYearLabel(movieYear: number): string {
  const currentYear = new Date().getFullYear();
  const diff = currentYear - movieYear;
  if (diff === 0) return 'current year';
  if (diff === 1) return 'last year';
  if (diff >= 2 && diff <= 3) return '2-3 years';
  return 'older';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client for authentication check
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header found');
      throw new Error('Unauthorized - no token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error('No user found in token');
      throw new Error('Unauthorized - invalid token');
    }

    console.log('User authenticated:', user.id);

    // Verify admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw new Error('Failed to verify permissions');
    }

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('User is not admin:', user.id);
      throw new Error('Admin access required');
    }

    console.log('Admin access verified');

    const { searchQuery, filters } = await req.json();
    const voteTiers: VoteTierConfig = filters.voteTiers || {
      currentYear: 300,
      lastYear: 500,
      twoToThreeYears: 750,
      older: 1000
    };
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');

    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key not configured');
    }

    console.log(`Checking movie: ${searchQuery}`);

    // Step 1: Search or fetch movie from TMDB
    let tmdbMovie: any = null;
    const isNumeric = /^\d+$/.test(searchQuery);

    if (isNumeric) {
      // Direct fetch by TMDB ID
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${searchQuery}?api_key=${TMDB_API_KEY}`
      );
      if (response.ok) {
        tmdbMovie = await response.json();
      }
    } else {
      // Search by title
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`
      );
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          tmdbMovie = searchData.results[0];
          // Fetch full details
          const detailsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}`
          );
          if (detailsResponse.ok) {
            tmdbMovie = await detailsResponse.json();
          }
        }
      }
    }

    if (!tmdbMovie) {
      return new Response(
        JSON.stringify({ error: 'Movie not found on TMDB' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check if movie exists in our database
    let existingMovie = null;
    if (tmdbMovie.imdb_id) {
      const { data } = await supabaseAdmin
        .from('movies')
        .select('*')
        .eq('imdb_id', tmdbMovie.imdb_id)
        .maybeSingle();
      existingMovie = data;
    }

    // Step 3: Check if movie was processed but skipped
    const { data: processedRecord } = await supabaseAdmin
      .from('tmdb_processed_movies')
      .select('*')
      .eq('tmdb_id', tmdbMovie.id)
      .maybeSingle();

    // Step 4: Simulate filters
    const movieData = {
      tmdb_id: tmdbMovie.id,
      title: tmdbMovie.title,
      rating: tmdbMovie.vote_average || 0,
      vote_count: tmdbMovie.vote_count || 0,
      year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 0,
      genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
      language: tmdbMovie.original_language || '',
      status: tmdbMovie.status || '',
      popularity: tmdbMovie.popularity || 0,
      poster_path: tmdbMovie.poster_path,
    };

    const requiredVotes = getRequiredVoteCount(movieData.year, voteTiers);
    const votesPassed = movieData.vote_count >= requiredVotes;
    
    const filterResults = {
      rating: {
        passes: movieData.rating >= filters.minRating && movieData.rating <= filters.maxRating,
        current: movieData.rating,
        required: `${filters.minRating}-${filters.maxRating}`,
      },
      vote_count: {
        passes: votesPassed,
        current: movieData.vote_count,
        required: `${requiredVotes}+ (${getYearLabel(movieData.year)})`,
      },
      year: {
        passes: movieData.year >= filters.yearRange[0] && movieData.year <= filters.yearRange[1],
        current: movieData.year,
        required: `${filters.yearRange[0]}-${filters.yearRange[1]}`,
      },
      genres: {
        passes: filters.genres.length === 0 || movieData.genres.some((g: string) => filters.genres.includes(g)),
        current: movieData.genres,
        required: filters.genres,
      },
      excluded_genres: {
        passes: !movieData.genres.some((g: string) => filters.excludedGenres.includes(g)),
        current: movieData.genres,
        excluded: filters.excludedGenres,
      },
      language: {
        passes: filters.languages.length === 0 || filters.languages.includes(movieData.language),
        current: movieData.language,
        required: filters.languages,
      },
      status: {
        passes: filters.statuses.includes(movieData.status),
        current: movieData.status,
        required: filters.statuses,
      },
      popularity: {
        passes: movieData.popularity >= filters.minPopularity,
        current: movieData.popularity,
        required: `${filters.minPopularity}+`,
      },
    };

    const blockingFilters = Object.entries(filterResults)
      .filter(([_, result]) => !result.passes)
      .map(([key]) => key);

    const overallPasses = blockingFilters.length === 0;

    let importStatus = 'not_processed';
    if (existingMovie) {
      importStatus = 'imported';
    } else if (processedRecord) {
      importStatus = processedRecord.import_status;
    }

    const response = {
      movie: movieData,
      import_status: importStatus,
      database_record: existingMovie,
      processed_record: processedRecord,
      filter_results: filterResults,
      overall_passes: overallPasses,
      blocking_filters: blockingFilters,
    };

    console.log(`Analysis complete: ${importStatus}, passes: ${overallPasses}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-movie-import:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
