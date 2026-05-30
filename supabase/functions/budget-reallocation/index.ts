import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { requireUser, requireFirmMember } from "../_shared/firm-auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createSupabaseClient(true);

  try {
    const user = await requireUser(req);
    const { campaign_id, action, reallocation_id } = await req.json();

    if (action === "analyze_and_reallocate") {
      const { data: campaign } = await supabase.from("meta_campaigns").select("*").eq("id", campaign_id).single();
      if (!campaign) throw new Error("Campaign not found");
      await requireFirmMember(supabase, user.id, campaign.firm_id);


      const { data: adSets } = await supabase.from("meta_ad_sets").select("*").eq("campaign_id", campaign_id).eq("status", "active");

      if (!adSets || adSets.length < 2) {
        return jsonResponse({ message: "Need at least 2 active ad sets for reallocation", reallocations: [] });
      }

      const { data: analytics } = await supabase
        .from("meta_campaign_analytics").select("*")
        .eq("campaign_id", campaign_id).order("date", { ascending: false }).limit(adSets.length * 7);

      const adSetPerformance = adSets.map((adSet: any) => {
        const adSetAnalytics = analytics?.filter((a: any) => a.ad_set_id === adSet.id) || [];
        const totalSpend = adSetAnalytics.reduce((s: number, a: any) => s + (a.spend || 0), 0);
        const totalLeads = adSetAnalytics.reduce((s: number, a: any) => s + (a.leads || 0), 0);
        const totalClicks = adSetAnalytics.reduce((s: number, a: any) => s + (a.clicks || 0), 0);
        const totalImpressions = adSetAnalytics.reduce((s: number, a: any) => s + (a.impressions || 0), 0);

        return {
          id: adSet.id, name: adSet.name, current_budget: adSet.daily_budget || 0,
          total_spend: totalSpend, total_leads: totalLeads, total_clicks: totalClicks,
          total_impressions: totalImpressions,
          cpl: totalLeads > 0 ? totalSpend / totalLeads : Infinity,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          days_of_data: adSetAnalytics.length,
        };
      });

      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
              content: JSON.stringify({ campaign: { name: campaign.name, daily_budget: campaign.daily_budget }, ad_sets: adSetPerformance }),
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please try again." }, 429);
        if (aiResp.status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
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

      for (const r of parsed.reallocations || []) {
        await supabase.from("budget_reallocation_logs").insert({
          campaign_id, from_ad_set_id: r.from_ad_set_id, to_ad_set_id: r.to_ad_set_id,
          amount_moved: r.amount, reason: r.reason, ai_confidence: r.confidence, applied: false,
        });
      }

      return jsonResponse({ result: parsed, performance: adSetPerformance });
    }

    if (action === "apply_reallocation") {
      const { data: log } = await supabase.from("budget_reallocation_logs").select("*, meta_campaigns!inner(firm_id)").eq("id", reallocation_id).single();
      if (!log) throw new Error("Reallocation not found");
      await requireFirmMember(supabase, user.id, (log as any).meta_campaigns?.firm_id);

      if (log.from_ad_set_id) {
        await supabase.from("meta_ad_sets").update({ daily_budget: log.from_budget - log.amount_moved }).eq("id", log.from_ad_set_id);
      }
      if (log.to_ad_set_id) {
        await supabase.from("meta_ad_sets").update({ daily_budget: log.to_budget + log.amount_moved }).eq("id", log.to_ad_set_id);
      }

      await supabase.from("budget_reallocation_logs").update({ applied: true }).eq("id", reallocation_id);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("budget-reallocation error:", e);
    return jsonResponse({ error: "Request failed" }, 500);
  }
});
