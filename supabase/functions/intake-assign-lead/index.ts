// Assigns a freshly-submitted intake lead directly to the firm that owns the
// branded landing page. Runs with the service role so anonymous form submitters
// can create the lead_purchase row that makes the lead appear in My Leads.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id, firm_id } = await req.json();
    if (!lead_id || !firm_id) {
      return new Response(JSON.stringify({ error: "lead_id and firm_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify lead exists and is still available
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, status")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the purchase row at $0 (firm-owned intake form)
    const { data: purchase, error: purchaseErr } = await supabase
      .from("lead_purchases")
      .insert({
        lead_id,
        firm_id,
        user_id: null,
        amount: 0,
        payment_method: "intake_form",
        pipeline_stage: "new_lead",
      })
      .select("id")
      .single();
    if (purchaseErr) throw purchaseErr;

    // Mark the lead as purchased so it disappears from the marketplace
    await supabase
      .from("leads")
      .update({ status: "purchased", updated_at: new Date().toISOString() })
      .eq("id", lead_id);

    return new Response(
      JSON.stringify({ success: true, purchase_id: purchase.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("intake-assign-lead error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
