import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";
import { checkPromptCompliance, summarizeCompliance } from "../_shared/compliance.ts";

// Strategy engine: brief + brand kit -> structured marketing strategy
// (objective, persona, pain_points, desires, USP, angles, hooks, CTAs, keywords)
serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;
  try {
    const { firm_id, brief, category, website, target_audience, brand_tone } = await req.json();
    if (!brief) throw new Error("brief required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Pull brand kit (best-effort)
    let brandKit: any = null;
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await admin.from("firm_brand_kit").select("*").eq("firm_id", firm_id).maybeSingle();
      brandKit = data;
    } catch (_) { /* ignore */ }

    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firm_id, "creative");
    const verticalName = vCfg?.vertical?.name ?? "lead-driven business";
    const resolved = resolveCategory(vCfg, category);
    const systemBase = buildSystemPrompt("creative", verticalSlug, vPrompt);

    const compliance = checkPromptCompliance(brief, verticalSlug);
    if (!compliance.allowed) {
      return jsonResponse({
        error: "Brief blocked by compliance checker",
        compliance: summarizeCompliance(compliance),
      }, 422);
    }
    const safeBrief = compliance.safe_prompt;

    const brandSummary = brandKit ? [
      brandKit.tone_of_voice ? `Tone of voice: ${brandKit.tone_of_voice}` : null,
      brandKit.guidelines_md ? `Brand guidelines: ${String(brandKit.guidelines_md).slice(0, 600)}` : null,
      Array.isArray(brandKit.trust_badges) && brandKit.trust_badges.length > 0
        ? `Trust signals: ${brandKit.trust_badges.map((b: any) => b?.label || b).join(", ")}`
        : null,
      brandKit.colors ? `Primary brand color: ${brandKit.colors.primary || "n/a"}` : null,
    ].filter(Boolean).join("\n") : "No brand kit configured.";

    const sys = `${systemBase}

You are a senior performance-marketing strategist for the ${verticalName} vertical.
Produce a tight strategic brief that the creative team will use to write ad copy and design visuals.
Be specific, audience-aware, and grounded in the brief and brand kit. Avoid generic platitudes.
${verticalSlug === "mass_tort" ? "Comply with state bar advertising rules; do not promise outcomes." : "Be truthful; no unverifiable claims."}

Return JSON ONLY in this exact shape:
{
  "objective": "string (1 sentence, e.g. 'Drive qualified intake calls from FL/TX adults 35-65 exposed to Roundup pre-2020')",
  "audience_persona": {
    "name": "string (short persona label)",
    "demographics": "string",
    "psychographics": "string",
    "where_they_hang_out": ["string"]
  },
  "pain_points": ["string", "string", "string", "string"],
  "desires": ["string", "string", "string"],
  "usp": "string (one-sentence unique value prop)",
  "angles": [
    {"name": "Emotional", "summary": "string"},
    {"name": "Promotional", "summary": "string"},
    {"name": "Urgency", "summary": "string"},
    {"name": "Problem-Solution", "summary": "string"},
    {"name": "Social Proof", "summary": "string"},
    {"name": "Brand Awareness", "summary": "string"}
  ],
  "hooks": ["string (scroll-stopping opener)", "string", "string", "string", "string"],
  "ctas": ["string", "string", "string", "string"],
  "keywords": ["string", "string", "string", "string", "string", "string", "string", "string"],
  "tone_recommendation": "string",
  "visual_direction": "string (mood, palette, do/dont)"
}`;

    const user = `Brief: ${safeBrief}
Vertical: ${verticalName}
Category: ${resolved.category}
Available categories: ${resolved.allCategories.join(", ") || "n/a"}
Target audience: ${target_audience || "auto-derive from brief"}
Brand tone override: ${brand_tone || "(use brand kit tone)"}
Website: ${website || "n/a"}

BRAND KIT:
${brandSummary}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.6,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
      throw new Error(`AI gateway error ${aiResp.status}`);
    }
    const aiData = await aiResp.json();
    const content: string = aiData.choices?.[0]?.message?.content || "";
    let strategy: any;
    try {
      const m = content.match(/```json\s*([\s\S]*?)\s*```/);
      strategy = m ? JSON.parse(m[1]) : JSON.parse(content);
    } catch {
      strategy = { raw: content };
    }

    return jsonResponse({
      strategy,
      vertical: verticalSlug,
      category: resolved.category,
      brand_kit_loaded: !!brandKit,
      compliance: summarizeCompliance(compliance),
    });
  } catch (e) {
    console.error("ai-creative-strategy error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
