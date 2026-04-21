import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext, getFirmIdForUser } from "../_shared/vertical.ts";

const CONSENT_TEXT = {
  tcpa: "I consent to receive calls and text messages regarding my inquiry, including via automated technology. Message and data rates may apply.",
  privacy: "I have read and agree to the Privacy Policy and Terms of Service.",
  hipaa: "I authorize the release of my medical records for the purpose of evaluating my potential claim.",
};

function buildSystemPromptForVertical(verticalSlug: string, verticalName: string, categories: string[], extraPrompt: string | null) {
  const subject =
    verticalSlug === "real_estate" ? "potential buyer/seller"
    : verticalSlug === "skin_clinic" ? "patient inquiry"
    : verticalSlug === "dental" ? "patient inquiry"
    : verticalSlug === "solar" ? "homeowner inquiry"
    : verticalSlug === "home_services" ? "service inquiry"
    : "potential claimant";

  const categoryLabel =
    verticalSlug === "real_estate" ? "interest type (Buy / Sell / Rent / Commercial)"
    : verticalSlug === "skin_clinic" ? "treatment of interest (e.g., Botox, Laser, Acne)"
    : verticalSlug === "dental" ? "service interest (Implants / Ortho / Cosmetic / General)"
    : verticalSlug === "solar" ? "project type (Residential / Commercial / Battery)"
    : verticalSlug === "home_services" ? "service type (HVAC / Plumbing / Roofing / etc.)"
    : "tort type";

  const consents = verticalSlug === "mass_tort"
    ? `[{ "key": "consent_tcpa", "text": "${CONSENT_TEXT.tcpa}", "required": true },
        { "key": "consent_privacy", "text": "${CONSENT_TEXT.privacy}", "required": true },
        { "key": "consent_hipaa", "text": "${CONSENT_TEXT.hipaa}", "required": false }]`
    : verticalSlug === "skin_clinic" || verticalSlug === "dental"
    ? `[{ "key": "consent_tcpa", "text": "${CONSENT_TEXT.tcpa}", "required": true },
        { "key": "consent_privacy", "text": "${CONSENT_TEXT.privacy}", "required": true },
        { "key": "consent_hipaa", "text": "${CONSENT_TEXT.hipaa}", "required": false }]`
    : `[{ "key": "consent_tcpa", "text": "${CONSENT_TEXT.tcpa}", "required": true },
        { "key": "consent_privacy", "text": "${CONSENT_TEXT.privacy}", "required": true }]`;

  const baseContent = extraPrompt && extraPrompt.trim().length > 0
    ? extraPrompt
    : `You are a warm, helpful AI intake specialist for a ${verticalName} business. Your job is to guide a ${subject} through intake conversationally — like a caring concierge, not a robot.`;

  return `${baseContent}

## YOUR GOAL
Collect required information through natural conversation. NEVER present a form. Ask 1-2 questions at a time. Be encouraging and empathetic.

## REQUIRED FIELDS (collect ALL)
- first_name (string)
- last_name (string)
- email (string, valid email)
- phone (string, at least 10 digits)
- state (2-letter US state abbreviation)
- tort_type (one of the available ${categoryLabel} options)
- age_bucket (one of: 18-34, 35-44, 45-54, 55-64, 65+)

## OPTIONAL FIELDS
- city, zip_code, address
- diagnosis_details (any specifics about their situation)
- exposure_details (background context)

## AVAILABLE CATEGORIES (${categoryLabel})
${categories.length > 0 ? categories.join(", ") : "general"}

## CONVERSATION FLOW
1. Welcome & ask what brought them in.
2. Identify the ${categoryLabel}; ask context questions appropriate to ${verticalSlug.replace("_", " ")}.
3. Collect name, email, phone.
4. Location (state required, city/zip optional).
5. Age range.
6. Present consent checkboxes.
7. Confirm submission.

## CRITICAL RULES
- Ask 1-2 questions per turn
- Show empathy
- Reassure confidentiality
- Validate inline
- NEVER fabricate data
- 2-4 sentence responses

## OUTPUT FORMAT — every response MUST be valid JSON:
{
  "message": "Your conversational response",
  "collected_fields": { ...fields extracted this turn... },
  "all_fields_so_far": { ...cumulative... },
  "needs_consent": false,
  "is_complete": false,
  "progress_percent": 0-100
}

When needs_consent is true, include consent_items: ${consents}

When is_complete is true, include final_data with all collected fields plus consent flags.`;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { messages, campaign_id, tort_type_hint, branding, firm_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Resolve firm_id from branding/campaign if not provided directly
    let resolvedFirmId: string | null = firm_id ?? null;
    if (!resolvedFirmId && branding?.firm_id) resolvedFirmId = branding.firm_id;
    if (!resolvedFirmId && campaign_id) {
      const supa = createSupabaseClient(true);
      const { data } = await supa.from("campaigns").select("firm_id").eq("id", campaign_id).maybeSingle();
      resolvedFirmId = (data?.firm_id as string | undefined) ?? null;
    }

    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(resolvedFirmId, "intake");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort Legal";
    const categories = (vCfg?.categories ?? []).map((c: any) => c.label).filter(Boolean);

    let systemPrompt = buildSystemPromptForVertical(verticalSlug, verticalName, categories, vPrompt);
    if (tort_type_hint) {
      systemPrompt += `\n\nThe user arrived with a pre-selected category: "${tort_type_hint}". Confirm this is what they're interested in.`;
    }
    if (branding?.firm_name) {
      systemPrompt += `\n\nYou are representing "${branding.firm_name}". Use their name when appropriate.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (response.status === 402) return jsonResponse({ error: "AI credits exhausted." }, 402);
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (e) {
    console.error("intake-chatbot error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
