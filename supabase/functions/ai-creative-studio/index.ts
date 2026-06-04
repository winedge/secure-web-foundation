import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";
import { buildQualityDirective, pickScriptModel, type QualityControls } from "../_shared/quality.ts";
import { checkPromptCompliance, summarizeCompliance } from "../_shared/compliance.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { brief, tort_type, category, target_audience, brand_tone, num_variants, firm_id, quality, strategy } = await req.json();
    if (!brief) throw new Error("brief required");
    const q: QualityControls = quality || {};
    const qualityDirective = buildQualityDirective(q);
    const model = pickScriptModel(q);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Brand kit (best-effort)
    let brandKit: any = null;
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data } = await admin.from("firm_brand_kit").select("*").eq("firm_id", firm_id).maybeSingle();
      brandKit = data;
    } catch (_) { /* ignore */ }

    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firm_id, "creative");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort Legal";
    const resolved = resolveCategory(vCfg, category ?? tort_type);
    const overrideSystem = buildSystemPrompt("creative", verticalSlug, vPrompt);

    // Vertical-aware compliance check on user-supplied brief
    const compliance = checkPromptCompliance(brief, verticalSlug);
    if (!compliance.allowed) {
      return jsonResponse({
        error: "Brief blocked by compliance checker",
        compliance: summarizeCompliance(compliance),
        vertical: verticalSlug,
      }, 422);
    }
    const safeBrief = compliance.safe_prompt;

    const complianceNote = verticalSlug === "mass_tort"
      ? "Comply with state bar advertising rules; avoid guarantees of outcome."
      : verticalSlug === "skin_clinic" || verticalSlug === "dental"
      ? "HIPAA-conscious tone; avoid before/after promises that imply guaranteed results."
      : verticalSlug === "real_estate"
      ? "Comply with Fair Housing; no language that could be discriminatory."
      : verticalSlug === "solar"
      ? "Be honest about incentives; do not promise specific savings."
      : "Be truthful and avoid unverifiable claims.";

    const brandSummary = brandKit ? [
      brandKit.tone_of_voice ? `Brand tone of voice: ${brandKit.tone_of_voice}` : null,
      brandKit.guidelines_md ? `Brand guidelines: ${String(brandKit.guidelines_md).slice(0, 600)}` : null,
      Array.isArray(brandKit.trust_badges) && brandKit.trust_badges.length > 0
        ? `Trust signals to surface: ${brandKit.trust_badges.map((b: any) => b?.label || b).join(", ")}`
        : null,
      brandKit.disclaimer ? `Required disclaimer: ${brandKit.disclaimer}` : null,
      brandKit.colors?.primary ? `Primary brand color: ${brandKit.colors.primary}` : null,
    ].filter(Boolean).join("\n") : "No brand kit configured.";

    const strategySummary = strategy ? `STRATEGY CONTEXT:\n${JSON.stringify(strategy).slice(0, 2000)}` : "";

    const ARCHETYPES = ["Emotional", "Promotional", "Urgency", "Problem-Solution", "Social Proof", "Brand Awareness"];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${overrideSystem}

You are a senior performance-marketing copywriter for the ${verticalName} vertical.
${complianceNote}

Production directives for image_prompt fields:
${qualityDirective}

Generate exactly ONE variant per archetype, in this fixed order:
${ARCHETYPES.map((a, i) => `${i + 1}. ${a}`).join("\n")}

For each variant produce these EXACT fields:
- id (v1..v6), archetype (one of the 6 above)
- headline (<40 chars, punchy, no clickbait)
- subheadline (<60 chars, supports headline)
- body_short (<125 chars, Meta-feed length)
- body_long (<500 chars, landing-page length)
- cta (2-4 word action verb phrase, e.g. "Get Free Case Review")
- hook (scroll-stopping first line, separate from headline)
- emotional_angle (1-3 words)
- target_hook (audience-specific pain or desire being addressed)
- badge (short trust/proof element, e.g. "Free | No Obligation" or "BBB A+ Rated")
- disclaimer (legal/compliance fineprint required by vertical; use brand kit disclaimer if provided, else minimal)
- image_prompt (full creative-director prompt for hero image)
- engagement_score (0-100)
- best_for_platform ("meta"|"google"|"tiktok"|"linkedin")
- a_b_test_hypothesis (what this variant tests vs others)

Return JSON ONLY:
{
  "campaign_name": "string",
  "variants": [{ ...fields above... }],
  "recommended_test_plan": "string",
  "brand_consistency_score": number
}`,
          },
          {
            role: "user",
            content: `Brief: ${safeBrief}
Vertical: ${verticalName}
Category: ${resolved.category}
Available categories: ${resolved.allCategories.join(', ') || 'n/a'}
Target audience: ${target_audience || 'auto from brief'}
Brand tone override: ${brand_tone || '(use brand kit tone)'}

BRAND KIT:
${brandSummary}

${strategySummary}

Generate all 6 archetype variants. Each must feel distinct in angle but consistent in brand voice.`,
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

    // Re-scan AI-generated headlines / bodies / image prompts for risky claims
    const variantFindings: Array<{ id: string; field: string; findings: any[] }> = [];
    if (Array.isArray(parsed.variants)) {
      parsed.variants = parsed.variants.map((v: any) => {
        const fields: Array<keyof typeof v> = ["headline", "body_short", "body_long", "cta", "image_prompt"];
        for (const f of fields) {
          if (typeof v[f] === "string") {
            const r = checkPromptCompliance(v[f], verticalSlug);
            if (r.findings.length > 0) {
              variantFindings.push({ id: v.id, field: f as string, findings: r.findings });
              v[f] = r.safe_prompt; // auto-rewrite soft violations; blocked terms also stripped
            }
          }
        }
        return v;
      });
    }

    return jsonResponse({
      ...parsed,
      vertical: verticalSlug,
      quality_tier: q.tier ?? "standard",
      resolution: q.resolution ?? "1080p",
      model_used: model,
      compliance: {
        ...summarizeCompliance(compliance),
        variant_rewrites: variantFindings,
      },
    });
  } catch (e) {
    console.error("ai-creative-studio error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
