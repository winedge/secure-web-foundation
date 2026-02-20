import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { action, context, firm_id } = await req.json();
    if (!action) throw new Error("action required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompts: Record<string, string> = {
      generate_google_campaign: `You are a Google Ads campaign strategist for legal lead generation. Create a complete campaign with:
- Campaign name and rationale
- Ad groups with keywords (exact, phrase, broad match) and bids
- Responsive search ads with 15 headlines and 4 descriptions per ad
- Negative keywords list
- Bid strategy recommendation with rationale
- Budget allocation across ad groups

Return JSON: {
  "campaign_name": "string",
  "campaign_type": "search|display|performance_max|video",
  "rationale": "string",
  "bid_strategy": "string",
  "bid_strategy_rationale": "string",
  "ad_groups": [{ "name": "string", "keywords": [{ "text": "string", "match_type": "exact|phrase|broad", "estimated_cpc": number }], "ads": [{ "headlines": ["string"], "descriptions": ["string"], "final_url": "string" }] }],
  "negative_keywords": ["string"],
  "estimated_cpa": number,
  "estimated_monthly_conversions": number
}`,

      keyword_research: `You are a Google Ads keyword research specialist for legal/tort marketing. Research and suggest keywords grouped by theme. Include:
- High-intent buyer keywords
- Informational keywords for top-of-funnel
- Long-tail keywords with lower competition
- Negative keywords to exclude
- Match type recommendations
- Estimated CPC ranges

Return JSON: {
  "keyword_groups": [{ "theme": "string", "keywords": [{ "text": "string", "match_type": "exact|phrase|broad", "estimated_cpc": number, "estimated_volume": number, "competition": "low|medium|high", "intent": "high|medium|low" }] }],
  "negative_keywords": ["string"],
  "strategy_notes": "string"
}`,

      optimize_google_campaign: `You are a Google Ads optimization AI. Analyze the campaign metrics and provide specific, actionable optimizations. Consider:
- Quality Score improvements
- Keyword bid adjustments
- Ad copy testing recommendations
- Search term analysis
- Budget reallocation
- Landing page suggestions

Return JSON: {
  "summary": "string",
  "recommendations": [{ "priority": "high|medium|low", "title": "string", "description": "string", "expected_impact": "string", "action_type": "string" }],
  "estimated_improvement": { "cpa_reduction": "string", "conversion_increase": "string", "quality_score_improvement": "string" }
}`,

      self_learning_report: `You are a self-learning AI that analyzes historical campaign data to identify patterns and improve future campaigns. Review all past campaign data and:
- Identify winning patterns (what worked)
- Identify losing patterns (what to avoid)
- Extract insights about audience behavior
- Recommend improvements for the next campaign
- Provide a confidence score for each recommendation

IMPORTANT: This is a LEARNING system. Each analysis should build upon previous insights to continuously improve.

Return JSON: {
  "performance_summary": "string",
  "patterns_identified": [{ "pattern": "string", "insight": "string", "confidence": number, "recommended_action": "string", "data_points": number }],
  "winning_strategies": ["string"],
  "losing_strategies": ["string"],
  "next_campaign_improvements": ["string"],
  "learning_score": number,
  "data_quality_assessment": "string"
}`,
    };

    const systemPrompt = systemPrompts[action] || systemPrompts.generate_google_campaign;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Action: ${action}\nContext: ${JSON.stringify(context)}` },
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
    } catch {
      parsed = { raw_response: content };
    }

    return jsonResponse({ result: parsed });
  } catch (e) {
    console.error("google-ads-ai error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
