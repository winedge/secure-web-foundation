import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVerticalContext, buildSystemPrompt, getFirmIdForUser } from "../_shared/vertical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firmId = await getFirmIdForUser(user.id);
    if (!firmId) {
      return new Response(JSON.stringify({ error: "No firm found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_text, file_name } = await req.json();
    if (!document_text || typeof document_text !== "string" || document_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Document text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncatedText = document_text.substring(0, 15000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vertical context
    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firmId, "document");
    const evaluatorTitle = vCfg?.terminology?.evaluator_title ?? "Case Evaluator";
    const subject = vCfg?.terminology?.evaluator_subject ?? "case";
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort Legal";
    const systemPrompt = buildSystemPrompt("document", verticalSlug, vPrompt);

    const prompt = `You are evaluating a document for the ${verticalName} vertical (${evaluatorTitle}).

Extract all relevant details from the document and produce a structured ${subject} evaluation tailored to ${verticalSlug.replace("_", " ")}. Adapt fields and reasoning appropriately:
- For mass_tort: tort/injury type, jurisdiction, plaintiff details, evidence, defendants, statute of limitations.
- For real_estate: property type, location, buyer/seller intent, price range, financing readiness, market timing.
- For solar: site suitability, energy usage, financing fit, incentives, install timeline.
- For dental / skin_clinic: treatment fit, medical history relevance, insurance signals, urgency.
- For home_services: scope of work, urgency, location, budget signals, scheduling.

Document (file: ${file_name || "uploaded document"}):
---
${truncatedText}
---

Use the evaluate_case tool. If information is missing, list it in missing_information and adjust scores accordingly.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_case",
              description: `Return comprehensive ${subject} evaluation for ${verticalSlug}`,
              parameters: {
                type: "object",
                properties: {
                  case_summary: { type: "string", description: "2-3 sentence summary" },
                  tort_type: { type: "string", description: `Identified category (tort type for legal, treatment type for clinic, property type for real estate, etc.)` },
                  jurisdiction: { type: "string", description: "Identified jurisdiction / region / market" },
                  viability_score: { type: "number", description: "0-100 viability / fit score" },
                  settlement_estimate_low: { type: "number", description: "Low end value estimate in USD" },
                  settlement_estimate_high: { type: "number", description: "High end value estimate in USD" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                  jurisdiction_notes: { type: "string" },
                  statute_of_limitations: { type: "string", description: "Time-window notes appropriate to vertical" },
                  similar_cases_summary: { type: "string" },
                  key_evidence: { type: "array", items: { type: "string" } },
                  missing_information: { type: "array", items: { type: "string" } },
                },
                required: ["case_summary", "tort_type", "jurisdiction", "viability_score", "settlement_estimate_low", "settlement_estimate_high", "strengths", "weaknesses", "recommendations", "jurisdiction_notes", "statute_of_limitations", "similar_cases_summary", "key_evidence", "missing_information"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_case" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI evaluation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI returned no evaluation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluation = JSON.parse(toolCall.function.arguments);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("ai_transparency_logs").insert({
      firm_id: firmId,
      action_type: "document_case_evaluation",
      model_name: "google/gemini-2.5-flash",
      model_version: "latest",
      input_summary: `${verticalSlug} document ${subject} evaluation: ${file_name || "uploaded"} (${truncatedText.length} chars)`,
      output_summary: `Viability: ${evaluation.viability_score}%, Category: ${evaluation.tort_type}, Value: $${evaluation.settlement_estimate_low}-$${evaluation.settlement_estimate_high}`,
      confidence_score: evaluation.viability_score,
      decision_factors: { vertical: verticalSlug, file_name, category: evaluation.tort_type, jurisdiction: evaluation.jurisdiction },
      compliant_frameworks: ["ABA-512", "GDPR", "EU-AI-Act"],
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-document-case-evaluator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
