import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVerticalContext, buildSystemPrompt } from "../_shared/vertical.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!lead_id || !firm_id) throw new Error("Missing lead_id or firm_id");

    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firm_id, "evaluation");
    const evaluatorTitle = vCfg?.terminology?.evaluator_title ?? "Case Evaluator";
    const subject = vCfg?.terminology?.evaluator_subject ?? "case";

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError) throw leadError;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const category = (lead as any).category || lead.tort_type;
    const systemPrompt = buildSystemPrompt("evaluation", verticalSlug, vPrompt);

    const prompt = `Evaluate this ${subject} for the ${vCfg?.vertical?.name ?? "Mass Tort Legal"} vertical.

${evaluatorTitle} Input:
- Category: ${category}
- State/Region: ${lead.state}
- Age Bucket: ${lead.age_bucket || "Unknown"}
- Notes: ${lead.diagnosis_details || "None provided"}
- Context: ${lead.exposure_details || "None provided"}
- Custom fields: ${JSON.stringify((lead as any).custom_fields || {})}
- Is Verified: ${lead.is_verified}
- Quality Score: ${lead.ai_quality_score || "N/A"}
- Fraud Risk: ${lead.fraud_risk_score || "N/A"}

Provide an evaluation appropriate for ${verticalSlug.replace("_", " ")}: viability/fit (0-100), realistic value range, strengths, weaknesses, recommendations, and any region-specific notes. Use the evaluate_case tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_case",
              description: `Return ${subject} viability evaluation for the ${verticalSlug} vertical`,
              parameters: {
                type: "object",
                properties: {
                  viability_score: { type: "number", description: "0-100 viability/fit score" },
                  settlement_estimate_low: { type: "number", description: "Low end value estimate in USD" },
                  settlement_estimate_high: { type: "number", description: "High end value estimate in USD" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                  jurisdiction_notes: { type: "string", description: "Region/jurisdiction notes" },
                  statute_of_limitations: { type: "string", description: "Time-window notes (e.g., statute of limitations for legal, financing window for solar, listing window for real estate)" },
                  similar_cases_summary: { type: "string", description: "Comparable past cases / deals" },
                },
                required: ["viability_score", "settlement_estimate_low", "settlement_estimate_high", "strengths", "weaknesses", "recommendations", "jurisdiction_notes", "statute_of_limitations", "similar_cases_summary"],
                additionalProperties: false,
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const evaluation = JSON.parse(toolCall.function.arguments);

    const { data: evalData, error: evalError } = await supabase
      .from("ai_case_evaluations")
      .upsert({
        lead_id,
        firm_id,
        viability_score: evaluation.viability_score,
        settlement_estimate_low: evaluation.settlement_estimate_low,
        settlement_estimate_high: evaluation.settlement_estimate_high,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        recommendations: evaluation.recommendations,
        jurisdiction_notes: evaluation.jurisdiction_notes,
        statute_of_limitations: evaluation.statute_of_limitations,
        similar_cases_summary: evaluation.similar_cases_summary,
        evaluated_at: new Date().toISOString(),
      }, { onConflict: "lead_id,firm_id" })
      .select()
      .single();

    if (evalError) throw evalError;

    // AI Transparency log
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("ai_transparency_logs").insert({
      lead_id,
      firm_id,
      action_type: "case_evaluation",
      model_name: "google/gemini-3-flash-preview",
      model_version: "latest",
      input_summary: `${verticalSlug} ${subject} evaluation for ${category} in ${lead.state}`,
      output_summary: `Viability: ${evaluation.viability_score}%, Value: $${evaluation.settlement_estimate_low}-$${evaluation.settlement_estimate_high}`,
      confidence_score: evaluation.viability_score,
      decision_factors: { vertical: verticalSlug, strengths: evaluation.strengths?.length || 0, weaknesses: evaluation.weaknesses?.length || 0 },
      compliant_frameworks: ["ABA-512", "GDPR", "EU-AI-Act"],
    }).catch(() => {});

    return new Response(JSON.stringify(evalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-case-evaluator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
