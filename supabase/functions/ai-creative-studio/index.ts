import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";
import { buildQualityDirective, pickScriptModel, type QualityControls } from "../_shared/quality.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { brief, tort_type, category, target_audience, brand_tone, num_variants, firm_id, quality } = await req.json();
    if (!brief) throw new Error("brief required");
    const q: QualityControls = quality || {};
    const qualityDirective = buildQualityDirective(q);
    const model = pickScriptModel(q);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firm_id, "creative");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort Legal";
    const resolved = resolveCategory(vCfg, category ?? tort_type);
    const overrideSystem = buildSystemPrompt("creative", verticalSlug, vPrompt);

    const complianceNote = verticalSlug === "mass_tort"
      ? "Comply with state bar advertising rules; avoid guarantees of outcome."
      : verticalSlug === "skin_clinic" || verticalSlug === "dental"
      ? "HIPAA-conscious tone; avoid before/after promises that imply guaranteed results."
      : verticalSlug === "real_estate"
      ? "Comply with Fair Housing; no language that could be discriminatory."
      : verticalSlug === "solar"
      ? "Be honest about incentives; do not promise specific savings."
      : "Be truthful and avoid unverifiable claims.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${overrideSystem}\n\nYou create complete ad campaign variants for the ${verticalName} vertical.\n${complianceNote}\n\nProduction directives for image_prompt fields:\n${qualityDirective}\n\nFor each variant produce: Headline (<40 chars), body_short (<125 chars), body_long (<500 chars), CTA, emotional angle, target hook, image prompt, engagement score 0-100.\n\nReturn JSON:\n{\n  "campaign_name": "string",\n  "variants": [{\n    "id": "v1", "headline": "string", "body_short": "string", "body_long": "string",\n    "cta": "string", "emotional_angle": "string", "target_hook": "string",\n    "image_prompt": "string", "engagement_score": number,\n    "best_for_platform": "meta|google|tiktok|linkedin",\n    "a_b_test_hypothesis": "string"\n  }],\n  "recommended_test_plan": "string",\n  "brand_consistency_score": number\n}`,
          },
          {
            role: "user",
            content: `Brief: ${brief}\nVertical: ${verticalName}\nCategory: ${resolved.category}\nAvailable categories for this vertical: ${resolved.allCategories.join(', ') || 'n/a'}\nTarget audience: ${target_audience || 'adults 25-65'}\nBrand tone: ${brand_tone || 'professional, empathetic'}\nGenerate ${num_variants || 5} creative variants tailored to ${verticalSlug.replace('_', ' ')}.`,
          },
        ],
        temperature: 0.7,
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
    } catch { parsed = { variants: [], campaign_name: "Untitled" }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug, quality_tier: q.tier ?? "standard", resolution: q.resolution ?? "1080p", model_used: model });
  } catch (e) {
    console.error("ai-creative-studio error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
