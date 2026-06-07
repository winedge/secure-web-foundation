// AI Campaign Builder | conversational, end-to-end Meta Ads campaign drafting.
// Uses Lovable AI Gateway for chat + tool calling. Uses OpenAI directly for image gen.
// Anti-hallucination: schema-locked tool calls, grounded context, evidence-only outputs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const META_OBJECTIVES = [
  "OUTCOME_LEADS", "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES",
];
const CTAS = [
  "LEARN_MORE", "SIGN_UP", "GET_QUOTE", "CONTACT_US",
  "APPLY_NOW", "BOOK_TRAVEL", "DOWNLOAD", "SUBSCRIBE", "GET_OFFER",
];
const PLACEMENTS = ["facebook", "instagram", "audience_network", "messenger"];

const TOOLS = [
  {
    type: "function",
    function: {
      name: "update_campaign_draft",
      description: "Set or update top-level campaign fields. Only call once you have user confirmation of the values.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 80 },
          objective: { type: "string", enum: META_OBJECTIVES },
          daily_budget: { type: "number", minimum: 5 },
          start_date: { type: "string" },
          end_date: { type: "string" },
          notes: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_audience",
      description: "Set audience targeting (locations, age, gender, interests).",
      parameters: {
        type: "object",
        properties: {
          locations: { type: "array", items: { type: "string" } },
          age_min: { type: "integer", minimum: 18, maximum: 65 },
          age_max: { type: "integer", minimum: 18, maximum: 65 },
          genders: { type: "array", items: { type: "string", enum: ["all", "male", "female"] } },
          interest_keywords: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ad",
      description: "Add one ad creative to the draft. Headlines max 40 chars, primary text max 125, description max 30.",
      parameters: {
        type: "object",
        properties: {
          headline: { type: "string", maxLength: 40 },
          primary_text: { type: "string", maxLength: 125 },
          description: { type: "string", maxLength: 30 },
          cta: { type: "string", enum: CTAS },
          link_url: { type: "string" },
          image_prompt: { type: "string", description: "If provided, AI will generate an image with OpenAI." },
          offer_summary: { type: "string", description: "Required when image_prompt is set. The concrete offer/value-prop the image must convey." },
        },
        required: ["headline", "primary_text", "cta"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_draft",
      description: "Call ONLY after the user explicitly confirms the full draft summary. Marks draft ready for review.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

async function generateImage(prompt: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `High-converting Meta ad creative, 1080x1080, clean modern design, no watermark. ${prompt}`,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!r.ok) {
      console.error("openai image error", r.status, await r.text());
      return null;
    }
    const json = await r.json();
    const b64 = json?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) {
    console.error("image gen error", e);
    return null;
  }
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
    if (!firm_id) return jsonResponse({ error: "No firm" }, 403);

    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const draft: Record<string, unknown> = body.draft || {};

    // Ground the system prompt with REAL firm data (no hallucinated benchmarks).
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
      limits: { headline: 40, primary_text: 125, description: 30, min_daily_budget_usd: 5 },
    };

    const system = `You are an expert Meta Ads campaign strategist for ${firm?.name ?? "this firm"}.
Your job: interview the user to build a winning, Meta-compliant campaign end-to-end.

RULES (strict, no exceptions):
1. ASK before you set. Never guess values. One short question at a time.
2. Only emit tool calls for values the user has CONFIRMED.
3. Use ONLY values from this grounded context. Never invent ad accounts, pixels, lead forms, audiences, or benchmarks:
${JSON.stringify(grounding, null, 2)}
4. Never fabricate metrics or "expected CTR" numbers. If you don't know, say so.
5. Respect Meta character limits: headline 40, primary_text 125, description 30.
6. Required progression: objective | audience | budget | offer | creative (1-3 ads) | review.
7. After collecting everything, output a clean markdown summary and ASK: "Confirm and finalize?". Only call finalize_draft AFTER the user replies yes.
8. For each ad, if you add image_prompt you MUST also pass a concrete offer_summary.
9. Current draft state: ${JSON.stringify(draft)}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        tools: TOOLS,
        temperature: 0.2,
      }),
    });

    if (aiRes.status === 429) return jsonResponse({ error: "AI rate limited, try again shortly" }, 429);
    if (aiRes.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
    if (!aiRes.ok) return jsonResponse({ error: `AI error ${aiRes.status}: ${await aiRes.text()}` }, 500);

    const aiJson = await aiRes.json();
    const msg = aiJson?.choices?.[0]?.message;
    const assistantText: string = msg?.content || "";
    const toolCalls = msg?.tool_calls || [];

    const newDraft = { ...draft };
    newDraft.ads = Array.isArray(newDraft.ads) ? newDraft.ads : [];
    let finalized = false;
    const toolEvents: Array<{ name: string; ok: boolean; note?: string }> = [];

    for (const tc of toolCalls) {
      const name = tc?.function?.name;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc?.function?.arguments || "{}"); } catch { /* ignore */ }

      if (name === "update_campaign_draft") {
        Object.assign(newDraft, args);
        toolEvents.push({ name, ok: true });
      } else if (name === "update_audience") {
        newDraft.audience = { ...(newDraft.audience as object || {}), ...args };
        toolEvents.push({ name, ok: true });
      } else if (name === "add_ad") {
        const ad: Record<string, unknown> = { ...args };
        if (args.image_prompt && !args.offer_summary) {
          toolEvents.push({ name, ok: false, note: "image_prompt without offer_summary | rejected" });
          continue;
        }
        if (args.image_prompt && typeof args.image_prompt === "string") {
          const img = await generateImage(`${args.image_prompt}. Offer: ${args.offer_summary}`);
          if (img) ad.image_url = img;
        }
        delete ad.image_prompt;
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
