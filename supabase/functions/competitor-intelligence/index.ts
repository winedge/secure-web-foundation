import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/auth.ts";
import { getVerticalContext, getFirmIdForUser, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient();
    const user = await getAuthenticatedUser(req, supabase);

    const { tort_type, category, target_states, firm_name } = await req.json();
    const requestedCategory = category ?? tort_type;
    if (!requestedCategory) return errorResponse("category is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const firmId = await getFirmIdForUser(user.id);
    const { config: vCfg, verticalSlug } = await getVerticalContext(firmId, "competitor");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort Legal";
    const resolved = resolveCategory(vCfg, requestedCategory);
    const resolvedCategory = resolved.category;

    const subjectLabel =
      verticalSlug === "real_estate" ? "real estate brokerage"
      : verticalSlug === "skin_clinic" ? "aesthetics clinic"
      : verticalSlug === "dental" ? "dental practice"
      : verticalSlug === "solar" ? "solar provider"
      : verticalSlug === "home_services" ? "home services company"
      : "law firm";

    const prompt = `You are a marketing intelligence analyst for the ${verticalName} vertical. Analyze the competitive landscape for a ${subjectLabel} specializing in "${resolvedCategory}"${resolved.allCategories.length ? ` (one of the configured categories for this vertical: ${resolved.allCategories.join(", ")})` : ""}${target_states?.length ? ` in these regions: ${target_states.join(", ")}` : ""}.

Provide a comprehensive competitive intelligence report. Use realistic, data-driven estimates appropriate to ${verticalSlug.replace("_", " ")}:

1. Market Overview: market size, growth, dynamics for this category in ${verticalName}.
2. Top Competitors (4-6): name (realistic but fictional), monthly ad spend range, primary channels, messaging themes, geographic focus, strength (1-10).
3. Ad Spend Patterns: monthly/seasonal trends.
4. Messaging Analysis: common strategies, emotional appeals, CTAs, differentiators used by competitors in ${verticalSlug.replace("_", " ")}.
5. Market Positioning Map: Price vs Quality, Volume vs Specialization.
6. Opportunities & Gaps${firm_name ? ` for ${firm_name}` : ""}.
7. Recommended Strategy: budget split, messaging, targeting, differentiation tailored to ${verticalSlug.replace("_", " ")}.

Return JSON:
{
  "market_overview": { "size_estimate": string, "growth_rate": string, "key_trends": string[] },
  "competitors": [{ "name": string, "monthly_spend": string, "channels": string[], "messaging_themes": string[], "geographic_focus": string[], "strength_score": number }],
  "spend_patterns": { "peak_months": string[], "low_months": string[], "avg_monthly_spend": string, "trends": string[] },
  "messaging_analysis": { "common_ctas": string[], "emotional_appeals": string[], "differentiators": string[], "underused_angles": string[] },
  "opportunities": string[],
  "recommended_strategy": { "budget_split": { "meta": number, "google": number, "other": number }, "key_messages": string[], "target_gaps": string[], "differentiation_tips": string[] }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are a competitive intelligence analyst for the ${verticalName} vertical. Always respond with valid JSON only, no markdown.` },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) return errorResponse("Rate limit exceeded. Please try again shortly.", 429);
      if (response.status === 402) return errorResponse("AI credits exhausted. Please add credits.", 402);
      return errorResponse("AI analysis failed", 500);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      parsed = { raw_analysis: content };
    }

    return jsonResponse({ analysis: parsed, category: resolvedCategory, available_categories: resolved.allCategories, target_states, vertical: verticalSlug, analyzed_at: new Date().toISOString() });
  } catch (e) {
    console.error("competitor-intelligence error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
