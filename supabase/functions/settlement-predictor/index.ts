import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVerticalContext } from "../_shared/vertical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGAL_VERTICALS = new Set(["mass_tort"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { lead_id, firm_id } = await req.json();
    if (!lead_id) throw new Error("Missing lead_id");

    const { verticalSlug } = await getVerticalContext(firm_id, "settlement");
    if (!LEGAL_VERTICALS.has(verticalSlug)) {
      return new Response(JSON.stringify({
        error: "Settlement Predictor is only available for legal verticals.",
        vertical: verticalSlug,
        gated: true,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError) throw leadError;

    const { data: evaluation } = await supabase
      .from("ai_case_evaluations")
      .select("*")
      .eq("lead_id", lead_id)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert legal settlement predictor. Simulate settlement outcomes for this mass tort case.

Case Data:
- Tort Type: ${lead.tort_type}
- State/Jurisdiction: ${lead.state}
- Age Bucket: ${lead.age_bucket || "Unknown"}
- Diagnosis: ${lead.diagnosis_details || "Not provided"}
- Exposure: ${lead.exposure_details || "Not provided"}
- Quality Score: ${lead.ai_quality_score || "N/A"}
- Verified: ${lead.is_verified}
${evaluation ? `- Prior Viability Score: ${evaluation.viability_score}` : ""}

Simulate multiple settlement scenarios considering:
1. Jurisdiction-specific judge tendencies and historical verdicts
2. Similar tort MDL settlement patterns
3. Strength of evidence (diagnosis, exposure documentation)
4. Best case, likely case, and worst case outcomes
5. Timeline to resolution

Use the predict_settlement tool to return your analysis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a settlement prediction AI with deep knowledge of mass tort litigation patterns, MDL proceedings, and jurisdiction-specific verdict data." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "predict_settlement",
            description: "Return settlement prediction analysis",
            parameters: {
              type: "object",
              properties: {
                scenarios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      probability: { type: "number" },
                      settlement_amount: { type: "number" },
                      timeline_months: { type: "number" },
                      description: { type: "string" }
                    },
                    required: ["name", "probability", "settlement_amount", "timeline_months", "description"],
                    additionalProperties: false
                  }
                },
                jurisdiction_analysis: {
                  type: "object",
                  properties: {
                    favorability_score: { type: "number" },
                    judge_tendency: { type: "string" },
                    historical_verdicts: { type: "string" },
                    mdl_status: { type: "string" }
                  },
                  required: ["favorability_score", "judge_tendency", "historical_verdicts", "mdl_status"],
                  additionalProperties: false
                },
                risk_factors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      factor: { type: "string" },
                      impact: { type: "string", enum: ["positive", "negative", "neutral"] },
                      weight: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["factor", "impact", "weight"],
                    additionalProperties: false
                  }
                },
                recommendation: { type: "string" },
                confidence_level: { type: "number" }
              },
              required: ["scenarios", "jurisdiction_analysis", "risk_factors", "recommendation", "confidence_level"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "predict_settlement" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const prediction = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ...prediction, vertical: verticalSlug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("settlement-predictor error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
