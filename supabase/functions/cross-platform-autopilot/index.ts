import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { total_budget, tort_type, category, current_allocation, performance_data, firm_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "autopilot");
    const verticalName = config?.vertical?.name ?? "Mass Tort";
    const resolved = resolveCategory(config, category ?? tort_type);
    const subject = resolved.category;

    const systemPrompt = `${buildSystemPrompt("autopilot", verticalSlug, customPrompt)}

You are a cross-platform media buying AI for the ${verticalName} industry. Optimize budget allocation across Meta, Google, TikTok, LinkedIn, and YouTube simultaneously, using ${verticalName}-appropriate channel mix and KPIs.

Current allocation: ${JSON.stringify(current_allocation || {})}
Performance data: ${JSON.stringify(performance_data || {})}

Return JSON:
{
  "optimized_allocation": {
    "meta": { "budget_pct": number, "budget_amount": number, "reasoning": "string", "expected_cpl": number, "expected_leads": number },
    "google": { "budget_pct": number, "budget_amount": number, "reasoning": "string", "expected_cpl": number, "expected_leads": number },
    "tiktok": { "budget_pct": number, "budget_amount": number, "reasoning": "string", "expected_cpl": number, "expected_leads": number },
    "linkedin": { "budget_pct": number, "budget_amount": number, "reasoning": "string", "expected_cpl": number, "expected_leads": number },
    "youtube": { "budget_pct": number, "budget_amount": number, "reasoning": "string", "expected_cpl": number, "expected_leads": number }
  },
  "total_expected_leads": number,
  "blended_cpl": number,
  "shift_recommendations": [{"from": "string", "to": "string", "amount": number, "reason": "string"}],
  "platform_synergies": ["string"],
  "risk_assessment": "string",
  "optimization_confidence": 0.0-1.0
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Optimize $${total_budget || 5000}/month across all platforms for ${subject || verticalName} campaigns in the ${verticalName} industry. Maximize lead volume while minimizing CPL.` },
        ],
        temperature: 0.3,
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
    } catch { parsed = { error: "Could not optimize" }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("cross-platform-autopilot error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
