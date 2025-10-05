import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate Jaccard similarity between two arrays
function jaccardSimilarity(arr1: string[], arr2: string[]): number {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Calculate normalized rating similarity
function ratingSimilarity(rating1: number, rating2: number): number {
  const maxDiff = 10;
  const diff = Math.abs(rating1 - rating2);
  return 1 - (diff / maxDiff);
}

// Calculate year proximity (prefer similar era movies)
function yearSimilarity(year1: number, year2: number): number {
  const maxDiff = 20;
  const diff = Math.abs(year1 - year2);
  return Math.max(0, 1 - (diff / maxDiff));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching recommendations for user:', user.id);

    // Fetch user's rated movies with full details
    const { data: userRatings, error: ratingsError } = await supabase
      .from('user_ratings')
      .select('user_rating, media_id')
      .eq('user_id', user.id)
      .eq('media_type', 'movie')
      .not('user_rating', 'is', null)
      .not('media_id', 'is', null)
      .gte('user_rating', 7) // Only consider highly rated movies
      .order('user_rating', { ascending: false })
      .limit(30);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch ratings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found user ratings:', userRatings?.length || 0);

    if (!userRatings || userRatings.length === 0) {
      console.log('No ratings found for user');
      return new Response(JSON.stringify({ recommendations: [], message: 'Rate some movies with 7+ to get recommendations!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get rated movie IDs and fetch their full details
    const ratedMovieIds = userRatings.map(r => r.media_id).filter(id => id);
    console.log('Rated movie IDs count:', ratedMovieIds.length);

    const { data: ratedMovies, error: ratedMoviesError } = await supabase
      .from('movies')
      .select('id, title, year, genres, keywords, actors, director, writing, sound, rating, popularity, vote_count')
      .in('id', ratedMovieIds);

    if (ratedMoviesError) {
      console.error('Error fetching rated movies:', ratedMoviesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch movie details' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetched rated movies:', ratedMovies?.length || 0);

    // Fetch unrated movies
    const { data: unratedMovies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title, year, genres, keywords, actors, director, writing, sound, rating, popularity, vote_count, poster')
      .not('id', 'in', `(${ratedMovieIds.join(',')})`)
      .gte('rating', 6.0)
      .not('rating', 'is', null)
      .order('popularity', { ascending: false })
      .limit(500);

    if (moviesError) {
      console.error('Error fetching unrated movies:', moviesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch movies' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found unrated movies:', unratedMovies?.length || 0);

    if (!unratedMovies || unratedMovies.length === 0) {
      console.log('No unrated movies available');
      return new Response(JSON.stringify({ recommendations: [], message: 'No unrated movies available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user rating map for weighted calculations
    const userRatingMap = new Map(
      userRatings.map(r => [r.media_id, r.user_rating])
    );

    // Calculate similarity scores for each unrated movie
    const scoredMovies = unratedMovies.map(movie => {
      let totalScore = 0;
      let totalWeight = 0;

      // Compare with each rated movie
      ratedMovies?.forEach(ratedMovie => {
        const userRating = userRatingMap.get(ratedMovie.id) || 5;
        const weight = userRating / 10; // Higher rated movies have more influence

        // Genre similarity (weight: 0.25)
        const genreSim = jaccardSimilarity(movie.genres || [], ratedMovie.genres || []);
        totalScore += genreSim * weight * 0.25;

        // Keywords similarity (weight: 0.2)
        const keywordSim = jaccardSimilarity(movie.keywords || [], ratedMovie.keywords || []);
        totalScore += keywordSim * weight * 0.2;

        // Actors similarity (weight: 0.15)
        const actorSim = jaccardSimilarity(movie.actors?.split(',') || [], ratedMovie.actors?.split(',') || []);
        totalScore += actorSim * weight * 0.15;

        // Director match (weight: 0.12)
        const directorMatch = movie.director === ratedMovie.director && movie.director ? 1 : 0;
        totalScore += directorMatch * weight * 0.12;

        // Writing similarity (weight: 0.08)
        const writingSim = jaccardSimilarity(movie.writing?.split(',') || [], ratedMovie.writing?.split(',') || []);
        totalScore += writingSim * weight * 0.08;

        // Sound similarity (weight: 0.05)
        const soundSim = jaccardSimilarity(movie.sound?.split(',') || [], ratedMovie.sound?.split(',') || []);
        totalScore += soundSim * weight * 0.05;

        // Rating similarity (weight: 0.08)
        const ratingSim = ratingSimilarity(movie.rating || 5, ratedMovie.rating || 5);
        totalScore += ratingSim * weight * 0.08;

        // Year similarity (weight: 0.07)
        const yearSim = yearSimilarity(movie.year || 2000, ratedMovie.year || 2000);
        totalScore += yearSim * weight * 0.07;

        totalWeight += weight;
      });

      // Normalize score by total weight
      const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Boost by popularity and vote count (slight adjustment)
      const popularityBoost = Math.log10((movie.popularity || 1) + 1) * 0.05;
      const voteBoost = Math.log10((movie.vote_count || 1) + 1) * 0.03;
      const qualityBoost = ((movie.rating || 5) - 5) * 0.02;

      const finalScore = normalizedScore + popularityBoost + voteBoost + qualityBoost;

      return {
        ...movie,
        similarityScore: finalScore,
        recommendationReason: generateReason(movie, ratedMovies || [])
      };
    });

    // Sort by similarity score and get top 12
    scoredMovies.sort((a, b) => b.similarityScore - a.similarityScore);
    const recommendations = scoredMovies.slice(0, 12);

    console.log('Successfully generated', recommendations.length, 'recommendations');

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recommend-movies function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate a human-readable reason for recommendation
function generateReason(movie: any, ratedMovies: any[]): string {
  const reasons: string[] = [];

  // Find the most similar rated movie
  let maxGenreOverlap = 0;
  let bestMatch: any = null;

  ratedMovies.forEach(rated => {
    const overlap = (movie.genres || []).filter((g: string) => 
      (rated.genres || []).includes(g)
    ).length;
    
    if (overlap > maxGenreOverlap) {
      maxGenreOverlap = overlap;
      bestMatch = rated;
    }
  });

  // Genre-based reason
  if (maxGenreOverlap > 0 && bestMatch) {
    const sharedGenres = (movie.genres || []).filter((g: string) => 
      (bestMatch.genres || []).includes(g)
    ).slice(0, 2);
    if (sharedGenres.length > 0) {
      reasons.push(`Similar ${sharedGenres.join('/')} to ${bestMatch.title}`);
    }
  }

  // Director match
  if (movie.director && ratedMovies.some(r => r.director === movie.director)) {
    reasons.push(`By ${movie.director}`);
  }

  // High rating
  if (movie.rating >= 8.0) {
    reasons.push(`Highly rated (${movie.rating}/10)`);
  }

  // Keywords overlap
  const allRatedKeywords = ratedMovies.flatMap(r => r.keywords || []);
  const sharedKeywords = (movie.keywords || []).filter((k: string) => 
    allRatedKeywords.includes(k)
  ).slice(0, 2);
  
  if (sharedKeywords.length > 0 && reasons.length < 2) {
    reasons.push(`Features ${sharedKeywords.join(', ')}`);
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Matches your preferences';
}

