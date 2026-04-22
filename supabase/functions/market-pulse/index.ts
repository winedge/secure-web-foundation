import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { tort_type, category, states, action, firm_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "market");
    const resolved = resolveCategory(config, category ?? tort_type);
    const subjectCategory = resolved.category;

    if (action === "scan") {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: (customPrompt && customPrompt.trim().length > 0 ? customPrompt : buildSystemPrompt("market", verticalSlug, null)) + `

Analyze current trends to identify emerging market opportunities for ${verticalSlug.replace(/_/g, " ")} businesses.
              
Focus on:
- FDA recalls, warnings, and safety alerts
- NHTSA vehicle recalls and investigations
- EPA environmental contamination events
- Pharmaceutical adverse event reports
- Consumer product safety issues
- Workplace exposure incidents
- New legislation affecting tort eligibility

For each emerging opportunity, provide actionable intelligence including estimated affected population, geographic hotspots, competition level, and recommended first-mover strategies.

Return JSON array:
{
  "alerts": [{
    "title": "string",
    "description": "detailed description",
    "tort_type": "string",
    "source_type": "news|fda|nhtsa|epa|social",
    "severity": "low|medium|high|critical",
    "affected_states": ["state abbreviations"],
    "estimated_market_size": "$X million",
    "competition_level": "low|medium|high",
    "confidence": 0.0-1.0,
    "first_mover_advantage": "string",
    "recommended_actions": ["action1", "action2"],
    "time_sensitivity": "string",
    "data_sources": ["source1", "source2"]
  }],
  "market_summary": "brief overall market conditions summary",
  "trending_torts": ["tort1", "tort2"]
}`
            },
            {
              role: "user",
              content: `Scan for emerging ${verticalSlug.replace(/_/g, " ")} opportunities${subjectCategory ? ` related to ${subjectCategory}` : ''}${resolved.allCategories.length ? ` (vertical categories: ${resolved.allCategories.join(', ')})` : ''}${states?.length ? ` in states: ${states.join(', ')}` : ''}. Focus on developments from the last 30 days and predict what will trend in the next 60 days. Provide at least 5-8 emerging opportunities.`
            }
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
        parsed = { alerts: [], market_summary: "Could not parse results", trending_torts: [] };
      }

      // Store alerts in database
      for (const alert of (parsed.alerts || []).slice(0, 10)) {
        await supabase.from("market_pulse_alerts").insert({
          title: alert.title,
          description: alert.description,
          tort_type: alert.tort_type,
          source_type: alert.source_type || "news",
          severity: alert.severity || "medium",
          affected_states: alert.affected_states || [],
          estimated_market_size: alert.estimated_market_size,
          competition_level: alert.competition_level,
          ai_confidence: alert.confidence || 0,
          ai_analysis: alert,
          is_trending: (alert.confidence || 0) > 0.7,
        });
      }

      return jsonResponse(parsed);
    }

    // Default: return recent alerts
    const { data: alerts } = await supabase
      .from("market_pulse_alerts")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(20);

    return jsonResponse({ alerts: alerts || [] });
  } catch (e) {
    console.error("market-pulse error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
