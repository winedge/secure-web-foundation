import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { campaign_id, action } = await req.json();

    if (action === "analyze_and_reallocate") {
      // Get campaign and its ad sets
      const { data: campaign } = await supabase
        .from("meta_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single();

      if (!campaign) throw new Error("Campaign not found");

      const { data: adSets } = await supabase
        .from("meta_ad_sets")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("status", "active");

      if (!adSets || adSets.length < 2) {
        return new Response(
          JSON.stringify({
            message: "Need at least 2 active ad sets for reallocation",
            reallocations: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get recent analytics for each ad set
      const { data: analytics } = await supabase
        .from("meta_campaign_analytics")
        .select("*")
        .eq("campaign_id", campaign_id)
        .order("date", { ascending: false })
        .limit(adSets.length * 7);

      // Build performance data per ad set
      const adSetPerformance = adSets.map((adSet: any) => {
        const adSetAnalytics = analytics?.filter(
          (a: any) => a.ad_set_id === adSet.id
        ) || [];
        const totalSpend = adSetAnalytics.reduce(
          (s: number, a: any) => s + (a.spend || 0), 0
        );
        const totalLeads = adSetAnalytics.reduce(
          (s: number, a: any) => s + (a.leads || 0), 0
        );
        const totalClicks = adSetAnalytics.reduce(
          (s: number, a: any) => s + (a.clicks || 0), 0
        );
        const totalImpressions = adSetAnalytics.reduce(
          (s: number, a: any) => s + (a.impressions || 0), 0
        );

        return {
          id: adSet.id,
          name: adSet.name,
          current_budget: adSet.daily_budget || 0,
          total_spend: totalSpend,
          total_leads: totalLeads,
          total_clicks: totalClicks,
          total_impressions: totalImpressions,
          cpl: totalLeads > 0 ? totalSpend / totalLeads : Infinity,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          days_of_data: adSetAnalytics.length,
        };
      });

      // Use AI to analyze and recommend reallocations
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are an AI budget optimizer for Meta ad campaigns. Analyze ad set performance data and recommend budget reallocations.
Rules:
- Move budget from underperforming ad sets to top performers
- Never reduce an ad set below 20% of its current budget
- Never increase an ad set above 200% of its current budget
- Total budget must remain the same
- Consider CPL, CTR, and lead volume
- Provide confidence score 0-1 for each reallocation
Return JSON: { "reallocations": [{ "from_ad_set_id": "...", "to_ad_set_id": "...", "amount": number, "reason": "...", "confidence": number }], "summary": "..." }`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  campaign: { name: campaign.name, daily_budget: campaign.daily_budget },
                  ad_sets: adSetPerformance,
                }),
              },
            ],
            temperature: 0.3,
          }),
        }
      );

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
      } catch {
        parsed = { reallocations: [], summary: content };
      }

      // Log reallocations
      for (const r of parsed.reallocations || []) {
        await supabase.from("budget_reallocation_logs").insert({
          campaign_id,
          from_ad_set_id: r.from_ad_set_id,
          to_ad_set_id: r.to_ad_set_id,
          amount_moved: r.amount,
          reason: r.reason,
          ai_confidence: r.confidence,
          applied: false,
        });
      }

      return new Response(
        JSON.stringify({ result: parsed, performance: adSetPerformance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "apply_reallocation") {
      const { reallocation_id } = await req.json();

      const { data: log } = await supabase
        .from("budget_reallocation_logs")
        .select("*")
        .eq("id", reallocation_id)
        .single();

      if (!log) throw new Error("Reallocation not found");

      // Update ad set budgets
      if (log.from_ad_set_id) {
        await supabase
          .from("meta_ad_sets")
          .update({
            daily_budget: supabase.rpc
              ? log.from_budget - log.amount_moved
              : log.from_budget,
          })
          .eq("id", log.from_ad_set_id);
      }

      if (log.to_ad_set_id) {
        await supabase
          .from("meta_ad_sets")
          .update({
            daily_budget: log.to_budget + log.amount_moved,
          })
          .eq("id", log.to_ad_set_id);
      }

      await supabase
        .from("budget_reallocation_logs")
        .update({ applied: true })
        .eq("id", reallocation_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("budget-reallocation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
