import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { firm_id, tort_type, category } = await req.json();
    if (!firm_id) throw new Error("firm_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "lookalike");
    const verticalName = config?.vertical?.name ?? "Mass Tort";
    const resolved = resolveCategory(config, category ?? tort_type);
    const subject = resolved.category;

    const { data: purchases } = await supabase
      .from("lead_purchases")
      .select("lead_id, amount, pipeline_stage")
      .eq("firm_id", firm_id)
      .order("purchased_at", { ascending: false })
      .limit(50);

    const leadIds = (purchases || []).map((p: any) => p.lead_id);
    const { data: leads } = await supabase
      .from("leads")
      .select("tort_type, category, state, age_bucket, tier")
      .in("id", leadIds.length > 0 ? leadIds : ["none"]);

    const systemPrompt = `${buildSystemPrompt("lookalike", verticalSlug, customPrompt)}

Analyze converting lead patterns and build hyper-targeted audience profiles for the ${verticalName} industry. Use seed attributes that matter for this vertical (e.g., demographics, intent signals, life events, financial readiness).

Lead data: ${JSON.stringify(leads || [])}

Return JSON:
{
  "seed_analysis": { "total_leads": number, "top_states": ["state"], "top_categories": ["category"], "age_distribution": {} },
  "audience_profiles": [{
    "name": "string",
    "description": "string",
    "demographics": { "age_range": "string", "gender_split": "string", "income_level": "string", "education": "string" },
    "psychographics": { "values": ["string"], "pain_points": ["string"], "media_consumption": ["string"] },
    "behavioral_signals": { "search_patterns": ["string"], "online_behavior": ["string"], "purchase_triggers": ["string"] },
    "estimated_reach": number,
    "match_quality": 0.0-1.0,
    "best_platform": "string",
    "targeting_instructions": { "meta": "string", "google": "string" }
  }],
  "expansion_opportunities": ["opp1"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Build lookalike audience profiles${subject ? ` for ${subject}` : ''} in the ${verticalName} industry based on this firm's converting lead patterns. Create 3-4 distinct audience segments.`,
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
    } catch { parsed = { audience_profiles: [] }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("lookalike-audience error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
