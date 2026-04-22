import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

const DEFAULT_LOCATIONS: Record<string, string[]> = {
  mass_tort: ["courthouses", "hospitals", "chiropractors"],
  skin_clinic: ["gyms", "spas", "shopping malls", "competitor clinics"],
  real_estate: ["open houses", "moving truck rentals", "competitor brokerages", "new development sites"],
  solar: ["home improvement stores", "EV charging stations", "high-utility-bill neighborhoods"],
  dental: ["pediatric clinics", "schools", "competitor dental offices", "shopping centers"],
  home_services: ["home improvement stores", "new construction sites", "competitor service vans"],
};

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { locations, tort_type, category, radius_meters, firm_id } = await req.json();
    const subject = category || tort_type;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "geofence");
    const verticalName = config?.vertical?.name ?? "Mass Tort";
    const defaults = DEFAULT_LOCATIONS[verticalSlug] ?? DEFAULT_LOCATIONS.mass_tort;

    const systemPrompt = `${buildSystemPrompt("geofence", verticalSlug, customPrompt)}

Design location-based ad campaigns targeting people near specific locations relevant to the ${verticalName} industry. Adjust location_type, timing, and creative tone for this vertical's audience.

Return JSON:
{
  "campaign_strategy": {
    "name": "string",
    "objective": "string",
    "total_estimated_reach": number,
    "estimated_daily_impressions": number
  },
  "geofences": [{
    "location_name": "string",
    "location_type": "string (vertical-specific)",
    "lat": number,
    "lng": number,
    "radius_meters": number,
    "why_target": "string",
    "best_times": ["string"],
    "estimated_daily_traffic": number,
    "ad_creative": { "headline": "string", "body": "string", "cta": "string" }
  }],
  "timing_strategy": { "best_days": ["string"], "best_hours": "string", "avoid": "string" },
  "attribution_plan": "string",
  "compliance_notes": ["string"]
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
            content: `Design geofence campaigns for the ${verticalName} industry${subject ? ` (${subject})` : ''} targeting these locations: ${JSON.stringify(locations || defaults)}. Radius: ${radius_meters || 500}m. Include compliance notes appropriate to ${verticalName} advertising.`,
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
    } catch { parsed = { geofences: [] }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("geofence-engine error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
