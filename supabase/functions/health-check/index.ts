import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== HEALTH CHECK STARTED ===');
    const timestamp = new Date().toISOString();
    console.log(`Timestamp: ${timestamp}`);

    const checks = {
      timestamp,
      environment: {} as Record<string, boolean>,
      database: {} as Record<string, any>,
      admin: {} as Record<string, any>,
      overall: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
    };

    // Check 1: Environment Variables
    console.log('\n--- Checking Environment Variables ---');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TMDB_API_KEY',
      'OMDB_API_KEY',
    ];

    for (const envVar of requiredEnvVars) {
      const exists = !!Deno.env.get(envVar);
      checks.environment[envVar] = exists;
      console.log(`${envVar}: ${exists ? '✅ Set' : '❌ Missing'}`);
    }

    const allEnvVarsSet = Object.values(checks.environment).every(v => v);

    // Check 2: Database Connectivity
    console.log('\n--- Checking Database Connectivity ---');
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { count, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });

      if (error) {
        checks.database.connectivity = false;
        checks.database.error = error.message;
        console.log(`❌ Database error: ${error.message}`);
      } else {
        checks.database.connectivity = true;
        checks.database.movieCount = count;
        console.log(`✅ Database connected (${count} movies)`);
      }
    } catch (error) {
      checks.database.connectivity = false;
      checks.database.error = error instanceof Error ? error.message : String(error);
      console.log(`❌ Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check 3: Admin User Exists
    console.log('\n--- Checking Admin User ---');
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find first admin user
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (rolesError) {
        checks.admin.exists = false;
        checks.admin.error = rolesError.message;
        console.log(`❌ Admin check error: ${rolesError.message}`);
      } else if (!adminRoles || adminRoles.length === 0) {
        checks.admin.exists = false;
        checks.admin.error = 'No admin users found';
        console.log('❌ No admin users found');
      } else {
        checks.admin.exists = true;
        checks.admin.userId = adminRoles[0].user_id;
        console.log(`✅ Admin user found: ${adminRoles[0].user_id}`);
      }
    } catch (error) {
      checks.admin.exists = false;
      checks.admin.error = error instanceof Error ? error.message : String(error);
      console.log(`❌ Admin check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Determine overall health
    const criticalChecks = [
      allEnvVarsSet,
      checks.database.connectivity,
      checks.admin.exists,
    ];

    if (criticalChecks.every(c => c === true)) {
      checks.overall = 'healthy';
    } else if (criticalChecks.some(c => c === true)) {
      checks.overall = 'degraded';
    } else {
      checks.overall = 'unhealthy';
    }

    console.log(`\n=== OVERALL STATUS: ${checks.overall.toUpperCase()} ===\n`);

    return new Response(
      JSON.stringify(checks, null, 2),
      {
        status: checks.overall === 'healthy' ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ HEALTH CHECK FAILED:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        overall: 'unhealthy',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
