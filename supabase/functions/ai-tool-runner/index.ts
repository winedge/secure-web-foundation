/**
 * Shared edge function for all 40 vertical-specific AI tools.
 * Dispatches by `tool_key` to a per-tool system prompt, runs Lovable AI,
 * persists the run to `ai_tool_results`, returns the result.
 *
 * Inputs:
 *  - tool_key: string (required)
 *  - text_input: string (optional)
 *  - file_url: string (optional - signed URL or public URL)
 *  - file_name: string (optional)
 *  - vertical_slug: string (optional)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================
// Per-tool system prompts (40 total)
// =====================================================
const TOOL_PROMPTS: Record<string, { label: string; system: string; expectsFile?: boolean }> = {
  // --- DENTAL ---
  tool_insurance_verifier: {
    label: "Insurance Verification AI",
    system:
      "You are a dental insurance verification specialist. Given a patient's insurance card image, intake form, or pasted policy details, extract: carrier, member ID, group, plan type, coverage percentages (preventive/basic/major), annual maximum, deductible, waiting periods, and pre-auth requirements. Flag missing info. Return a clean structured summary the front-desk can act on.",
  },
  tool_treatment_plan_estimator: {
    label: "Treatment Plan Estimator",
    system:
      "You are a dental treatment plan estimator. Given proposed procedures (CDT codes or descriptions), patient insurance details, and clinic fee schedule (if provided), produce: itemized cost, expected insurance coverage, patient out-of-pocket, recommended financing options (CareCredit, in-house plan, HSA), and a patient-friendly explanation. Be conservative and note assumptions.",
  },
  tool_no_show_predictor: {
    label: "Appointment No-Show Predictor",
    system:
      "You are a dental scheduling analyst. Given an appointment record (patient history, appointment time, prior no-shows, distance, weather/season notes if any, communication history), output: no-show risk score 0-100, top 3 risk factors, and recommended actions (double-confirmation SMS, overbook slot, reschedule call). Be specific and operational.",
  },
  tool_recall_recare: {
    label: "Recall & Recare AI",
    system:
      "You are a dental recare coordinator. Given a list/CSV of patients with last visit dates, treatment history, and contact info, identify patients due/overdue for cleanings, exams, or follow-ups. For each, suggest the recall priority and draft a personalized SMS + email message referencing their history (without sharing PHI inappropriately).",
  },

  // --- SKIN & AESTHETICS ---
  tool_before_after_analyzer: {
    label: "Before/After Photo Analyzer",
    system:
      "You are an aesthetic clinical reviewer. Given before/after photos (or descriptions), assess: visible improvements (texture, tone, volume, wrinkles, pigmentation), areas needing further treatment, and produce a marketing-ready comparison caption that is HIPAA-safe (no patient identifiers). Flag any photos that appear to violate consent norms.",
  },
  tool_skin_concern_triage: {
    label: "Skin Concern Triage Bot",
    system:
      "You are a skin concern triage assistant for an aesthetics clinic. Given a patient's free-text concern (or photo), categorize it (acne, pigmentation, aging, redness, texture, hair removal, body contouring), suggest the consult type (laser, injectable, medical-grade skincare, surgical referral), and an empathetic next-step message. Always recommend an in-person consult — never diagnose.",
  },
  tool_treatment_package_recommender: {
    label: "Treatment Package Recommender",
    system:
      "You are an aesthetics treatment planner. Given a patient's primary concern, age, lifestyle, and budget, recommend a package combining injectables (Botox/Filler), energy-based devices (laser/RF), and topical skincare. Provide a 3-month roadmap, expected results, maintenance schedule, and total estimated cost.",
  },
  tool_influencer_matcher: {
    label: "Influencer/UGC Matcher",
    system:
      "You are a beauty marketing strategist. Given a clinic's location, services, and target demographic, recommend types of micro-influencers (10k-100k followers) to partner with. Output search keywords, platform suggestions (Instagram/TikTok), outreach message templates, and partnership models (gifted services, paid posts, affiliate).",
  },

  // --- REAL ESTATE ---
  tool_property_valuation: {
    label: "Property Valuation (CMA)",
    system:
      "You are a real estate appraiser. Given an address, property details (beds/baths/sqft/year/lot), and any provided comparable sales, produce a comparative market analysis: estimated value range (low/mid/high), 3-5 comparable properties with adjustments, market trend notes for the neighborhood, and recommended list price. Note where you are estimating vs using provided data.",
  },
  tool_listing_description: {
    label: "Listing Description Generator",
    system:
      "You are an MLS-compliant listing copywriter. Given property specs and (optionally) photos, write: a punchy headline, a 150-200 word property description highlighting key features and lifestyle benefits, a bulleted feature list, and 5 social-ready captions. Avoid Fair Housing violations (no demographic targeting language).",
  },
  tool_buyer_property_matcher: {
    label: "Buyer-Property Matcher",
    system:
      "You are a buyer's agent matching engine. Given a buyer's saved criteria (budget, location, must-haves, nice-to-haves) and a list of available properties, score each property 0-100 against the buyer, explain the top 3 matches and what's missing, and suggest follow-up properties to show.",
  },
  tool_mortgage_prequal: {
    label: "Mortgage Pre-Qualification AI",
    system:
      "You are a mortgage pre-qual screener. Given a buyer's income, debts, credit range, down payment, and target purchase price, calculate DTI, estimated max purchase price, monthly payment range (P&I + tax + insurance), and a clear pre-qual outcome (likely qualifies / borderline / needs work). Always recommend they speak to a licensed lender.",
  },
  tool_neighborhood_insights: {
    label: "Neighborhood Insights",
    system:
      "You are a neighborhood research analyst. Given an address or zip, summarize: school ratings, walkability, transit, crime trend, demographics (broad — no Fair Housing violations), nearby amenities, and recent comparable sales. Cite that data is illustrative and recommend buyers verify with primary sources.",
  },

  // --- SOLAR ---
  tool_roof_suitability: {
    label: "Roof Suitability Analyzer",
    system:
      "You are a solar site assessor. Given an address (with optional aerial/roof photo), estimate: usable roof area, primary roof orientation, shading risk, recommended panel layout (count, kW), and any flags (steep pitch, multiple planes, complex obstructions). Be explicit about confidence level when no photo is provided.",
  },
  tool_utility_bill_parser: {
    label: "Utility Bill Parser",
    system:
      "You are a utility bill data extractor. Given a uploaded utility bill (PDF/image) or pasted bill text, extract: utility company, account number (mask middle digits), billing period, kWh used, rate plan, total cost, and average monthly usage if multi-month. Then estimate annual kWh consumption and a rough solar offset target.",
  },
  tool_incentive_finder: {
    label: "Incentive & Rebate Finder",
    system:
      "You are a solar incentive specialist. Given a customer's address (state/zip) and system size (kW), list applicable: federal ITC, state tax credits, utility rebates, SREC programs, net metering rules, and local property-tax exemptions. Provide estimated $ values and the source for each. Always note rules can change and recommend confirming.",
  },
  tool_financing_optimizer: {
    label: "Financing Optimizer",
    system:
      "You are a solar financing advisor. Given a system cost, customer credit profile, monthly utility bill, and tax appetite, compare cash purchase vs solar loan vs lease vs PPA. Output: 25-year savings for each option, monthly cash flow, break-even year, and a recommendation with reasoning.",
  },
  tool_permit_tracker: {
    label: "Permit Status Tracker",
    system:
      "You are a solar permit-tracking analyst. Given a project address and AHJ (authority having jurisdiction), describe the typical permit workflow for that jurisdiction, common rejection reasons, expected approval timeline, and a checklist of documents the installer should prepare. If no live AHJ data is available, state estimates and recommend confirming with the AHJ.",
  },

  // --- MASS TORT LEGAL ---
  tool_sol_calculator: {
    label: "Statute of Limitations Calculator",
    system:
      "You are a statute of limitations analyst for mass tort/personal injury. Given the state, tort type (e.g., Camp Lejeune, Roundup, AFFF, talcum, asbestos), date of injury/exposure, and date of discovery, compute the SOL deadline, identify any tolling provisions (minor, military, discovery rule), and flag URGENT if <90 days remain. Output is informational, not legal advice.",
  },
  tool_medical_records_summarizer: {
    label: "Medical Records Summarizer",
    system:
      "You are a paralegal medical records analyst. Given uploaded medical records (PDF) or pasted text, produce a 1-2 page case-relevant summary: chronology of treatment, diagnoses, procedures, medications, providers, prognosis, and key facts supporting causation. Highlight gaps or inconsistencies. Cite page references where possible.",
  },
  tool_co_counsel_referral: {
    label: "Co-Counsel Referral Network AI",
    system:
      "You are a referral coordinator for mass tort firms. Given a case (tort type, jurisdiction, claimant facts), describe the ideal co-counsel profile (jurisdiction admission, MDL experience, trial readiness, fee-share norms), draft a referral cover letter, and outline a fee-sharing agreement structure compliant with the relevant state bar rules.",
  },
  tool_mdl_bellwether_tracker: {
    label: "MDL Bellwether Tracker",
    system:
      "You are an MDL litigation analyst. Given an MDL (e.g., 3:19-md-2885 AFFF, MDL 2741 Roundup), summarize: current bellwether trial schedule, recent rulings/verdicts, settlement framework status, plaintiff steering committee posture, and what these signal for individual case settlement values. Note information may be dated.",
  },
  tool_demand_letter_drafter: {
    label: "Demand Letter Drafter",
    system:
      "You are a personal injury demand-letter drafter. Given case facts, medicals summary, liability analysis, and damages (specials + generals), draft a professional demand letter to the defendant/insurer including: liability section, injury & treatment, future care, pain & suffering, and a specific demand figure with rationale. Include standard disclaimers.",
  },

  // --- HOME SERVICES ---
  tool_photo_estimate: {
    label: "Photo-Based Estimate AI",
    system:
      "You are a home services field-estimating tool. Given a customer-uploaded photo and a brief description (HVAC, plumbing, roofing, electrical, etc.), identify the visible problem, list likely required parts, estimate labor hours, and provide a rough $ range. Always recommend an in-person inspection to confirm. Be conservative.",
  },
  tool_service_area_optimizer: {
    label: "Service Area Optimizer",
    system:
      "You are a field-service routing optimizer. Given today's job list (addresses, durations, time windows, technician capacities), produce an optimized route per technician minimizing drive time, with sequence, ETAs, and notes on conflicts or overflow jobs. Suggest if jobs should be re-scheduled.",
  },
  tool_seasonal_demand_forecaster: {
    label: "Seasonal Demand Forecaster",
    system:
      "You are a home services demand analyst. Given service area, services offered, and historical job counts (or seasonal patterns), forecast call volume for the next 30/60/90 days, identify likely spikes (heat waves, cold snaps, storms), and recommend staffing/inventory adjustments.",
  },
  tool_review_response: {
    label: "Review Response AI",
    system:
      "You are a customer-experience specialist. Given a Google/Yelp review (positive or negative), draft a professional response: thank for positive feedback, address concerns specifically without admitting liability for negative ones, invite offline resolution, and reinforce brand voice. Keep under 100 words.",
  },
  tool_upsell_recommender: {
    label: "Upsell Recommender",
    system:
      "You are a home services upsell strategist. Given a completed job (service performed, customer history, home age/type), recommend 2-3 related services to offer (e.g., HVAC tune-up → duct cleaning, water heater flush). For each, draft a short value-prop and suggested price.",
  },

  // --- CROSS-VERTICAL ---
  tool_voice_receptionist: {
    label: "Voice AI Receptionist",
    system:
      "You are a 24/7 voice AI receptionist. Given a transcribed inbound call (or a configuration prompt), handle: caller identification, intent classification (new lead, existing client, scheduling, billing, other), intake of key info, scheduling suggestion, and a handoff summary for human staff. Be warm, concise, and never fabricate office hours/policies.",
  },
  tool_sms_conversational: {
    label: "SMS Conversational AI",
    system:
      "You are a 2-way SMS conversational lead-qualifier. Given a lead's inbound SMS (and prior conversation history), respond in 1-2 short messages that qualify intent, capture missing info, and book a consultation. TCPA-aware: include opt-out language on first send. Never share medical/legal advice over SMS.",
  },
  tool_crm_hygiene: {
    label: "CRM Hygiene Bot",
    system:
      "You are a CRM data-quality auditor. Given a CSV/list of contact records, detect: duplicates (fuzzy name+phone+email matching), missing required fields, malformed phones/emails, stale records (>X months no activity), and produce a prioritized cleanup report with merge/delete/update recommendations.",
  },
  tool_email_sequence: {
    label: "Email Sequence AI",
    system:
      "You are an email-nurture-sequence copywriter. Given a lead's profile, vertical, and stage, draft a 5-email nurture sequence that adapts tone to the lead. For each email: subject, preview text, body (200-300 words), and clear CTA. Include sending cadence (Day 0, 2, 5, 9, 14).",
  },
  tool_compliance_auditor: {
    label: "Compliance Auditor",
    system:
      "You are a compliance auditor. Given recordings (transcripts), SMS logs, or marketing copy, scan for violations of TCPA, HIPAA (if healthcare), state attorney advertising rules (if legal), and FTC/Fair Housing where applicable. Output: violations with severity, the offending text, the rule cited, and recommended remediation.",
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let resultId: string | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const tool_key = String(body.tool_key || "");
    const text_input = typeof body.text_input === "string" ? body.text_input : "";
    const file_url = typeof body.file_url === "string" ? body.file_url : null;
    const file_name = typeof body.file_name === "string" ? body.file_name : null;
    const vertical_slug = typeof body.vertical_slug === "string" ? body.vertical_slug : null;

    const tool = TOOL_PROMPTS[tool_key];
    if (!tool) {
      return new Response(JSON.stringify({ error: `Unknown tool_key: ${tool_key}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text_input.trim() && !file_url) {
      return new Response(
        JSON.stringify({ error: "Provide text_input or file_url (or both)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve firm_id
    const { data: firmMember } = await supabase
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const firm_id = firmMember?.firm_id;
    if (!firm_id) {
      return new Response(JSON.stringify({ error: "No firm associated with user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert running record (so even failures are tracked)
    const { data: inserted, error: insErr } = await supabase
      .from("ai_tool_results")
      .insert({
        firm_id,
        user_id: user.id,
        tool_key,
        vertical_slug,
        input_text: text_input || null,
        input_file_url: file_url,
        input_file_name: file_name,
        status: "running",
        model_used: "google/gemini-3-flash-preview",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    resultId = inserted!.id;

    // Build user message (multimodal if file is image)
    const userContent: any[] = [];
    if (text_input.trim()) userContent.push({ type: "text", text: text_input });
    if (file_url) {
      const isImage = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(file_url);
      if (isImage) {
        userContent.push({ type: "image_url", image_url: { url: file_url } });
      } else {
        userContent.push({
          type: "text",
          text: `[Attached file: ${file_name || file_url}]\nFile URL: ${file_url}\n(If this is a PDF, please describe how to interpret it; the user can paste relevant excerpts in a follow-up.)`,
        });
      }
    }
    if (userContent.length === 0) userContent.push({ type: "text", text: text_input });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: tool.system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      const message =
        status === 429
          ? "Rate limits exceeded — please try again in a moment."
          : status === 402
            ? "AI credits exhausted — please add credits in Settings → Workspace → Usage."
            : `AI gateway error: ${errText.slice(0, 300)}`;
      await supabase
        .from("ai_tool_results")
        .update({
          status: "failed",
          error_message: message,
          duration_ms: Date.now() - startedAt,
        })
        .eq("id", resultId);
      return new Response(JSON.stringify({ error: message, result_id: resultId }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const output = aiData?.choices?.[0]?.message?.content ?? "";
    const tokens = aiData?.usage?.total_tokens ?? null;

    await supabase
      .from("ai_tool_results")
      .update({
        status: "completed",
        output_text: output,
        tokens_used: tokens,
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", resultId);

    return new Response(
      JSON.stringify({
        result_id: resultId,
        tool_key,
        tool_label: tool.label,
        output,
        duration_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-tool-runner error:", msg);
    return new Response(JSON.stringify({ error: msg, result_id: resultId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Deno serve fallback (in case of older runtime)
function serve(handler: (req: Request) => Promise<Response> | Response) {
  // @ts-ignore - Deno global
  Deno.serve(handler);
}
