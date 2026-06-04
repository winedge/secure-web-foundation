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
            content: `Brief: ${safeBrief}\nVertical: ${verticalName}\nCategory: ${resolved.category}\nAvailable categories for this vertical: ${resolved.allCategories.join(', ') || 'n/a'}\nTarget audience: ${target_audience || 'adults 25-65'}\nBrand tone: ${brand_tone || 'professional, empathetic'}\nGenerate ${num_variants || 5} creative variants tailored to ${verticalSlug.replace('_', ' ')}.`,
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
