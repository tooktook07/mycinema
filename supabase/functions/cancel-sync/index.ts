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
    const { syncId } = await req.json();

    if (!syncId) {
      return new Response(
        JSON.stringify({ error: "syncId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate syncId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(syncId)) {
      return new Response(
        JSON.stringify({ error: "Invalid syncId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize authenticated Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} attempting to cancel sync ${syncId}`);

    // Check if sync exists and get its owner
    const { data: sync, error: syncError } = await supabaseClient
      .from("sync_history")
      .select("user_id")
      .eq("id", syncId)
      .single();

    if (syncError || !sync) {
      console.error('Sync not found:', syncError);
      return new Response(
        JSON.stringify({ error: "Sync not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership or admin role
    if (sync.user_id !== user.id) {
      // Check if user is admin
      const { data: role, error: roleError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !role) {
        console.error(`Unauthorized: User ${user.id} tried to cancel sync ${syncId} owned by ${sync.user_id}`);
        return new Response(
          JSON.stringify({ error: "Unauthorized: You can only cancel your own syncs" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Admin ${user.id} cancelling sync ${syncId}`);
    }

    // Update sync history status to cancelled
    const { error } = await supabaseClient
      .from("sync_history")
      .update({
        completed_at: new Date().toISOString(),
        status: 'cancelled'
      })
      .eq("id", syncId);

    if (error) {
      console.error('Error cancelling sync:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully cancelled sync ${syncId}`);
    return new Response(
      JSON.stringify({ success: true, message: "Sync cancelled successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cancel-sync function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
