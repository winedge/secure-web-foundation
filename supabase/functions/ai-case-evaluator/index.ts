import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError) throw leadError;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert legal case evaluator specializing in mass tort litigation. Evaluate the viability of this case and provide settlement estimates.

Case Data:
- Tort Type: ${lead.tort_type}
- State/Jurisdiction: ${lead.state}
- Age Bucket: ${lead.age_bucket || "Unknown"}
- Diagnosis Details: ${lead.diagnosis_details || "None provided"}
- Exposure Details: ${lead.exposure_details || "None provided"}
- Is Verified: ${lead.is_verified}
- Quality Score: ${lead.ai_quality_score || "N/A"}
- Fraud Risk: ${lead.fraud_risk_score || "N/A"}

Consider jurisdiction-specific laws, statute of limitations, precedent cases, and the strength of evidence when evaluating. Use the evaluate_case tool to return your analysis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a legal case evaluation AI. Always use the provided tool to return structured analysis." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_case",
              description: "Return case viability evaluation",
              parameters: {
                type: "object",
                properties: {
                  viability_score: { type: "number", description: "0-100 case viability score" },
                  settlement_estimate_low: { type: "number", description: "Low end settlement estimate in USD" },
                  settlement_estimate_high: { type: "number", description: "High end settlement estimate in USD" },
                  strengths: { type: "array", items: { type: "string" }, description: "Case strengths (3-5 items)" },
                  weaknesses: { type: "array", items: { type: "string" }, description: "Case weaknesses (2-4 items)" },
                  recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations (3-5 items)" },
                  jurisdiction_notes: { type: "string", description: "Notes about the jurisdiction's stance" },
                  statute_of_limitations: { type: "string", description: "Relevant statute of limitations info" },
                  similar_cases_summary: { type: "string", description: "Brief summary of similar precedent cases" },
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

    // AI Transparency logging for EU AI Act compliance
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
      input_summary: `Case evaluation for ${lead.tort_type} lead in ${lead.state}`,
      output_summary: `Viability: ${evaluation.viability_score}%, Settlement: $${evaluation.settlement_estimate_low}-$${evaluation.settlement_estimate_high}`,
      confidence_score: evaluation.viability_score,
      decision_factors: { strengths: evaluation.strengths?.length || 0, weaknesses: evaluation.weaknesses?.length || 0, recommendations: evaluation.recommendations?.length || 0 },
      compliant_frameworks: ["ABA-512", "GDPR", "EU-AI-Act"],
    }).catch(() => {});  // Non-blocking

    return new Response(JSON.stringify(evalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-case-evaluator error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
