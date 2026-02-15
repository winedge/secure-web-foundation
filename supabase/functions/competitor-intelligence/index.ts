import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/auth.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient();
    const user = await getAuthenticatedUser(req, supabase);

    const { tort_type, target_states, firm_name } = await req.json();

    if (!tort_type) return errorResponse("tort_type is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a legal marketing intelligence analyst. Analyze the competitive landscape for a law firm specializing in "${tort_type}" tort cases${target_states?.length ? ` in these states: ${target_states.join(", ")}` : ""}.

Provide a comprehensive competitive intelligence report with the following sections. Use realistic, data-driven estimates based on your knowledge of the legal advertising market:

1. **Market Overview**: Current market size, growth trends, and key dynamics for this tort type.

2. **Top Competitors** (provide 4-6): For each competitor include:
   - Firm name (use realistic but fictional firm names)
   - Estimated monthly ad spend range
   - Primary advertising channels (Meta, Google, TV, etc.)
   - Key messaging themes
   - Geographic focus
   - Competitive strength (1-10 scale)

3. **Ad Spend Patterns**: Monthly/seasonal trends in ad spending for this tort type. When spend peaks and dips.

4. **Messaging Analysis**: Common messaging strategies, emotional appeals, CTAs, and differentiators used by competitors.

5. **Market Positioning Map**: Where competitors sit on axes of Price vs. Quality and Volume vs. Specialization.

6. **Opportunities & Gaps**: Underserved markets, messaging gaps, and strategic opportunities${firm_name ? ` specifically for ${firm_name}` : ""}.

7. **Recommended Strategy**: Specific, actionable recommendations for budget allocation, messaging, targeting, and differentiation.

Return the response as valid JSON with this structure:
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
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a competitive intelligence analyst for legal marketing. Always respond with valid JSON only, no markdown." },
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

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      parsed = { raw_analysis: content };
    }

    return jsonResponse({ analysis: parsed, tort_type, target_states, analyzed_at: new Date().toISOString() });
  } catch (e) {
    console.error("competitor-intelligence error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
