import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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

    // Fetch user's rated movies
    const { data: userRatings, error: ratingsError } = await supabase
      .from('user_ratings')
      .select('sentiment_rating, media_id')
      .eq('user_id', user.id)
      .eq('media_type', 'movie')
      .not('sentiment_rating', 'is', null)
      .not('media_id', 'is', null)
      .order('sentiment_rating', { ascending: false })
      .limit(50);

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
      return new Response(JSON.stringify({ recommendations: [], message: 'No ratings found. Rate some movies first!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get rated movie IDs and fetch their details
    const ratedMovieIds = userRatings.map(r => r.media_id).filter(id => id);
    console.log('Rated movie IDs count:', ratedMovieIds.length);

    const { data: ratedMovies, error: ratedMoviesError } = await supabase
      .from('movies')
      .select('id, title, year, genres, plot, rating')
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
      .select('id, title, year, genres, plot, rating, poster')
      .not('id', 'in', `(${ratedMovieIds.join(',')})`)
      .gte('rating', 6.5)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
      .limit(150);

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

    // Prepare data for AI - combine ratings with movie details
    const ratedMoviesData = userRatings
      .map(rating => {
        const movie = ratedMovies?.find(m => m.id === rating.media_id);
        if (!movie) return null;
        return {
          title: movie.title,
          year: movie.year,
          genres: movie.genres,
          rating: rating.sentiment_rating,
          plot: movie.plot?.substring(0, 150)
        };
      })
      .filter(m => m !== null);

    console.log('Prepared rated movies data:', ratedMoviesData.length);

    const unratedMoviesData = unratedMovies.map(m => ({
      id: m.id,
      title: m.title,
      year: m.year,
      genres: m.genres,
      imdbRating: m.rating,
      plot: m.plot?.substring(0, 150)
    }));

    console.log('Calling AI with', ratedMoviesData.length, 'rated and', unratedMoviesData.length, 'unrated movies');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a movie recommendation expert. Analyze the user's rating patterns and recommend movies they would love.
            
Consider:
- Genres they rated highly
- Rating patterns (what they rated 8+)
- Movie themes and styles
- Balance between popular and hidden gems

Return ONLY a JSON array of exactly 12 movie recommendations in this format:
[{"id": "uuid", "reason": "short reason why they'd love it"}]

Keep reasons under 20 words and focus on their preferences.`
          },
          {
            role: 'user',
            content: `User's rated movies (rating/10):\n${JSON.stringify(ratedMoviesData, null, 2)}\n\nAvailable unrated movies:\n${JSON.stringify(unratedMoviesData, null, 2)}\n\nRecommend 12 movies from the unrated list.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service requires payment. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to generate recommendations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    const aiContent = aiData.choices[0].message.content;
    console.log('AI content length:', aiContent?.length);
    
    // Parse AI response
    let recommendedIds;
    try {
      recommendedIds = JSON.parse(aiContent);
      console.log('Parsed recommendations count:', recommendedIds?.length);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(JSON.stringify({ error: 'Invalid AI response format', details: aiContent }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enrich recommendations with full movie data
    const recommendations = recommendedIds
      .map((rec: any) => {
        const movie = unratedMovies.find(m => m.id === rec.id);
        if (!movie) {
          console.log('Movie not found for recommendation:', rec.id);
          return null;
        }
        return {
          ...movie,
          recommendationReason: rec.reason
        };
      })
      .filter((m: any) => m !== null)
      .slice(0, 12);

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
