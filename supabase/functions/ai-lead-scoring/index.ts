import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVerticalContext, buildSystemPrompt, getFirmIdForUser } from "../_shared/vertical.ts";

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

    // Vertical context
    const { config: vCfg, prompt: vPrompt, verticalSlug } = await getVerticalContext(firm_id, "scoring");
    const subject = vCfg?.terminology?.lead_singular ?? "Lead";

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError) throw leadError;

    const { data: purchase } = await supabase
      .from("lead_purchases")
      .select("*")
      .eq("lead_id", lead_id)
      .eq("firm_id", firm_id)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = buildSystemPrompt("scoring", verticalSlug, vPrompt);
    const category = (lead as any).category || lead.tort_type;

    const prompt = `Score this ${subject.toLowerCase()} for the ${vCfg?.vertical?.name ?? "Mass Tort Legal"} vertical.

${subject} Data:
- Name: ${lead.first_name} ${lead.last_name}
- Category: ${category}
- State: ${lead.state}
- Age Bucket: ${lead.age_bucket || "Unknown"}
- Current AI Quality Score: ${lead.ai_quality_score || "N/A"}
- Fraud Risk Score: ${lead.fraud_risk_score || "N/A"}
- Tier: ${lead.tier}
- Is Verified: ${lead.is_verified}
- Is Exclusive: ${lead.is_exclusive}
- Diagnosis / Details: ${lead.diagnosis_details || "None provided"}
- Exposure / Context: ${lead.exposure_details || "None provided"}
- Custom fields: ${JSON.stringify((lead as any).custom_fields || {})}
- Source: ${lead.source || "Unknown"}
- Pipeline Stage: ${purchase?.pipeline_stage || "new_lead"}

Tailor your scoring rubric, factors, and recommended action to the ${verticalSlug.replace("_", " ")} business. Use the suggest_scoring tool.`;

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
              name: "suggest_scoring",
              description: `Return ${subject.toLowerCase()} scoring analysis tailored to the ${verticalSlug} vertical`,
              parameters: {
                type: "object",
                properties: {
                  conversion_probability: { type: "number", description: "0-100 probability of conversion" },
                  recommended_action: { type: "string", description: "One clear next-step recommendation" },
                  optimal_contact_time: { type: "string", description: "Best time/day to contact" },
                  predicted_value: { type: "number", description: "Estimated value in USD" },
                  scoring_factors: {
                    type: "object",
                    properties: {
                      tort_strength: { type: "number", description: "1-10 strength of opportunity" },
                      urgency: { type: "number", description: "1-10 urgency to act" },
                      documentation_quality: { type: "number", description: "1-10 quality of provided info" },
                      jurisdiction_favorability: { type: "number", description: "1-10 favorability of state/region" },
                      risk_level: { type: "string", enum: ["low", "medium", "high"] },
                      key_insight: { type: "string", description: "Most important insight, vertical-specific" },
                    },
                    required: ["tort_strength", "urgency", "documentation_quality", "jurisdiction_favorability", "risk_level", "key_insight"],
                  },
                },
                required: ["conversion_probability", "recommended_action", "optimal_contact_time", "predicted_value", "scoring_factors"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_scoring" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: `AI gateway error: ${status}`, fallback: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const scoring = JSON.parse(toolCall.function.arguments);
    const startTime = Date.now();

    const { data: scoreData, error: scoreError } = await supabase
      .from("ai_lead_scores")
      .upsert({
        lead_id,
        firm_id,
        conversion_probability: scoring.conversion_probability,
        recommended_action: scoring.recommended_action,
        scoring_factors: scoring.scoring_factors,
        optimal_contact_time: scoring.optimal_contact_time,
        predicted_value: scoring.predicted_value,
        scored_at: new Date().toISOString(),
      }, { onConflict: "lead_id,firm_id" })
      .select()
      .single();

    if (scoreError) throw scoreError;

    // AI transparency log
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("ai_transparency_logs").insert({
      lead_id,
      firm_id,
      action_type: "lead_scoring",
      model_name: "google/gemini-3-flash-preview",
      model_version: aiData.model || "unknown",
      input_summary: `${verticalSlug} scoring for ${category} ${subject.toLowerCase()} in ${lead.state}`,
      output_summary: `Conversion: ${scoring.conversion_probability}%, Value: $${scoring.predicted_value}, Action: ${scoring.recommended_action}`,
      confidence_score: scoring.conversion_probability,
      decision_factors: { ...scoring.scoring_factors, vertical: verticalSlug },
      processing_time_ms: Date.now() - startTime,
      compliant_frameworks: ["ABA-512", "GDPR", "EU-AI-Act"],
    });

    return new Response(JSON.stringify(scoreData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-lead-scoring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
