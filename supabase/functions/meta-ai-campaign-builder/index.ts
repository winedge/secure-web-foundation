// AI Campaign Builder | conversational, end-to-end Meta Ads campaign drafting.
// Uses Lovable AI Gateway for both chat (Gemini) and image generation.
// Anti-hallucination: grounded context, evidence-only outputs, code-side validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const META_OBJECTIVES = [
  "OUTCOME_LEADS", "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES",
];
const CTAS = [
  "LEARN_MORE", "SIGN_UP", "GET_QUOTE", "CONTACT_US",
  "APPLY_NOW", "BOOK_TRAVEL", "DOWNLOAD", "SUBSCRIBE", "GET_OFFER",
];
const PLACEMENTS = ["facebook", "instagram", "audience_network", "messenger"];
const LIMITS = { headline: 40, primary_text: 125, description: 30, min_daily_budget_usd: 5 };

// Keep tool schemas minimal | Gemini's tool-calling rejects many JSON-Schema
// keywords (maxLength, enum on long lists, additionalProperties, minimum, etc.)
// We validate constraints in code instead.
const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_campaign_draft",
      description: "Set or update top-level campaign fields. Only call once you have user confirmation.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          objective: { type: "string", description: `One of: ${META_OBJECTIVES.join(", ")}` },
          daily_budget: { type: "number", description: "USD, minimum 5" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          notes: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_audience",
      description: "Set audience targeting.",
      parameters: {
        type: "object",
        properties: {
          locations: { type: "array", items: { type: "string" } },
          age_min: { type: "integer" },
          age_max: { type: "integer" },
          genders: { type: "array", items: { type: "string", description: "all | male | female" } },
          interest_keywords: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ad",
      description: "Add one ad creative. Headline <=40 chars, primary_text <=125, description <=30.",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string" },
          primary_text: { type: "string" },
          description: { type: "string" },
          cta: { type: "string", description: `One of: ${CTAS.join(", ")}` },
          link_url: { type: "string" },
          image_prompt: { type: "string", description: "If provided, an image is generated. Must also provide offer_summary." },
          offer_summary: { type: "string" },
        },
        required: ["headline", "primary_text", "cta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_draft",
      description: "Call ONLY after the user explicitly confirms the full draft summary.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function generateImageLovable(prompt: string): Promise<string | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: `High-converting Meta ad creative, square 1:1, clean modern design, no watermark, no fake text overlays. ${prompt}` },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      console.error("lovable image gen error", r.status, await r.text());
      return null;
    }
    const json = await r.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url || null;
  } catch (e) {
    console.error("lovable image gen exception", e);
    return null;
  }
}

// Try Meta's generative AI image endpoint first (when the account is allowlisted),
// fall back to Leadsthru AI. Returns { url, source, request_id }.
async function generateImage(
  prompt: string,
  opts: { preferMetaGenAi: boolean; adAccountId?: string; authHeader: string },
): Promise<{ url: string | null; source: "meta_genai" | "leadsthru_ai"; request_id: string | null }> {
  if (opts.preferMetaGenAi && opts.adAccountId) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/meta-genai-creative`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: opts.authHeader },
        body: JSON.stringify({
          action: "generate",
          type: "image",
          prompt: `High-converting Meta ad creative, square 1:1, clean modern design. ${prompt}`,
          ad_account_id: opts.adAccountId,
          count: 1,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const url = Array.isArray(j?.urls) && j.urls[0] ? j.urls[0] : null;
        if (url) return { url, source: "meta_genai", request_id: j?.request_id ?? null };
      } else {
        console.warn("meta-genai-creative returned", r.status, "| falling back to Leadsthru AI");
      }
    } catch (e) {
      console.warn("meta-genai-creative exception | falling back to Leadsthru AI", e);
    }
  }
  const url = await generateImageLovable(prompt);
  return { url, source: "leadsthru_ai", request_id: null };
}

function clamp(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: member } = await admin.from("firm_members").select("firm_id").eq("user_id", user.id).maybeSingle();
    const firm_id = member?.firm_id;
    if (!firm_id) return jsonResponse({ error: "No firm associated with your account" }, 403);

    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = Array.isArray(body?.messages) ? body.messages : [];
    const draft: Record<string, unknown> = body?.draft && typeof body.draft === "object" ? body.draft : {};
    // Caller may pre-select an ad account + Meta Generative AI preference.
    const preferMetaGenAi: boolean = body?.use_meta_genai === true;
    const preferredAdAccountId: string | undefined = typeof body?.ad_account_id === "string" ? body.ad_account_id : undefined;

    const [{ data: firm }, { data: adAccounts }, { data: pixels }, { data: leadForms }] = await Promise.all([
      admin.from("firms").select("id,name,states,practice_type,vertical_id").eq("id", firm_id).maybeSingle(),
      admin.from("meta_ad_accounts").select("id,name,currency,account_status").eq("firm_id", firm_id),
      admin.from("meta_pixels").select("id,name,pixel_id").eq("firm_id", firm_id),
      admin.from("meta_lead_forms").select("id,name,status").eq("firm_id", firm_id),
    ]);

    const grounding = {
      firm: { name: firm?.name, states: firm?.states, practice: firm?.practice_type },
      ad_accounts: adAccounts ?? [],
      pixels: pixels ?? [],
      lead_forms: leadForms ?? [],
      allowed_objectives: META_OBJECTIVES,
      allowed_ctas: CTAS,
      placements: PLACEMENTS,
      limits: LIMITS,
    };

    const system = `You are an expert Meta Ads campaign strategist for ${firm?.name ?? "this firm"}.
Your job: interview the user to build a winning, Meta-compliant campaign end-to-end.

STRICT RULES (no exceptions):
1. ASK before you set. Never guess values. One short focused question at a time.
2. Only emit tool calls for values the user has CONFIRMED.
3. Use ONLY values from this grounded context. Never invent ad accounts, pixels, lead forms, or benchmarks:
${JSON.stringify(grounding, null, 2)}
4. Never fabricate metrics or "expected CTR" numbers. If you don't know, say so.
5. Respect Meta character limits: headline 40, primary_text 125, description 30.
6. Progression: objective -> audience -> budget -> offer -> creative (1-3 ads) -> review.
7. After collecting everything, output a clean markdown summary and ASK "Confirm and finalize?". Only call finalize_draft AFTER the user replies yes.
8. For each ad, if you include image_prompt you MUST also include offer_summary.
9. Current draft state: ${JSON.stringify(draft)}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
        tools: TOOLS,
      }),
    });

    if (aiRes.status === 429) return jsonResponse({ error: "AI rate limited, try again shortly" }, 429);
    if (aiRes.status === 402) return jsonResponse({ error: "AI credits exhausted | add credits in Settings > Plans & credits" }, 402);
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      return jsonResponse({ error: `AI error ${aiRes.status}: ${text.slice(0, 300)}` }, 500);
    }

    const aiJson = await aiRes.json();
    const msg = aiJson?.choices?.[0]?.message;
    const assistantText: string = msg?.content || "";
    const toolCalls: Array<{ function?: { name?: string; arguments?: string } }> = msg?.tool_calls || [];

    const newDraft: Record<string, unknown> = { ...draft };
    newDraft.ads = Array.isArray(newDraft.ads) ? newDraft.ads : [];
    let finalized = false;
    const toolEvents: Array<{ name: string; ok: boolean; note?: string }> = [];

    for (const tc of toolCalls) {
      const name = tc?.function?.name || "";
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* ignore */ }

      if (name === "update_campaign_draft") {
        if (args.objective && !META_OBJECTIVES.includes(String(args.objective))) {
          toolEvents.push({ name, ok: false, note: `Invalid objective ${args.objective}` });
          continue;
        }
        if (typeof args.daily_budget === "number" && args.daily_budget < LIMITS.min_daily_budget_usd) {
          args.daily_budget = LIMITS.min_daily_budget_usd;
        }
        Object.assign(newDraft, args);
        toolEvents.push({ name, ok: true });
      } else if (name === "update_audience") {
        newDraft.audience = { ...((newDraft.audience as object) || {}), ...args };
        toolEvents.push({ name, ok: true });
      } else if (name === "add_ad") {
        if (args.image_prompt && !args.offer_summary) {
          toolEvents.push({ name, ok: false, note: "image_prompt without offer_summary | rejected" });
          continue;
        }
        if (args.cta && !CTAS.includes(String(args.cta))) {
          toolEvents.push({ name, ok: false, note: `Invalid CTA ${args.cta}` });
          continue;
        }
        const ad: Record<string, unknown> = {
          headline: clamp(args.headline, LIMITS.headline),
          primary_text: clamp(args.primary_text, LIMITS.primary_text),
          description: clamp(args.description, LIMITS.description),
          cta: args.cta,
          link_url: args.link_url,
          creative_source: "leadsthru_ai",
        };
        if (typeof args.image_prompt === "string") {
          const adAccountId = preferredAdAccountId
            ?? (Array.isArray(adAccounts) && adAccounts[0]?.id ? adAccounts[0].id : undefined);
          const img = await generateImage(
            `${args.image_prompt}. Offer: ${args.offer_summary}`,
            { preferMetaGenAi, adAccountId, authHeader: auth },
          );
          if (img.url) {
            ad.image_url = img.url;
            ad.creative_source = img.source;
            if (img.request_id) ad.meta_genai_request_id = img.request_id;
          }
        }
        (newDraft.ads as unknown[]).push(ad);
        toolEvents.push({ name, ok: true });
      } else if (name === "finalize_draft") {
        finalized = true;
        toolEvents.push({ name, ok: true });
      }
    }

    return jsonResponse({
      assistant: assistantText,
      draft: newDraft,
      finalized,
      tool_events: toolEvents,
    });
  } catch (e) {
    console.error("builder error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
