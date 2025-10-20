import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Setting up service role key in system_settings...');
    
    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Update system_settings table with the service role key (wrap in object for proper jsonb storage)
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        value: { key: serviceRoleKey },
        updated_at: new Date().toISOString()
      })
      .eq('key', 'service_role_key')
      .select();
    
    if (error) {
      console.error('Error updating system_settings:', error);
      throw error;
    }
    
    console.log('Successfully configured service role key in system_settings');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Service role key configured successfully',
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in setup-service-key function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
