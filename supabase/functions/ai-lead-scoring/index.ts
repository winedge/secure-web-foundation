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

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError) throw leadError;

    // Fetch purchase info
    const { data: purchase } = await supabase
      .from("lead_purchases")
      .select("*")
      .eq("lead_id", lead_id)
      .eq("firm_id", firm_id)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert legal lead scoring AI for mass tort litigation. Analyze this lead and provide a conversion probability score and actionable insights.

Lead Data:
- Name: ${lead.first_name} ${lead.last_name}
- Tort Type: ${lead.tort_type}
- State: ${lead.state}
- Age Bucket: ${lead.age_bucket || "Unknown"}
- Current AI Quality Score: ${lead.ai_quality_score || "N/A"}
- Fraud Risk Score: ${lead.fraud_risk_score || "N/A"}
- Tier: ${lead.tier}
- Is Verified: ${lead.is_verified}
- Is Exclusive: ${lead.is_exclusive}
- Diagnosis Details: ${lead.diagnosis_details || "None provided"}
- Exposure Details: ${lead.exposure_details || "None provided"}
- Source: ${lead.source || "Unknown"}
- Pipeline Stage: ${purchase?.pipeline_stage || "new_lead"}
- Days Since Purchase: ${purchase ? Math.floor((Date.now() - new Date(purchase.purchased_at).getTime()) / 86400000) : "N/A"}

Provide your analysis using the suggest_scoring tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a legal lead conversion scoring AI. Always use the provided tool to return structured data." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_scoring",
              description: "Return lead scoring analysis",
              parameters: {
                type: "object",
                properties: {
                  conversion_probability: { type: "number", description: "0-100 probability of conversion to signed retainer" },
                  recommended_action: { type: "string", description: "One clear next-step recommendation" },
                  optimal_contact_time: { type: "string", description: "Best time/day to contact this lead" },
                  predicted_value: { type: "number", description: "Estimated case value in USD" },
                  scoring_factors: {
                    type: "object",
                    properties: {
                      tort_strength: { type: "number", description: "1-10 strength of tort claim" },
                      urgency: { type: "number", description: "1-10 urgency to act" },
                      documentation_quality: { type: "number", description: "1-10 quality of provided info" },
                      jurisdiction_favorability: { type: "number", description: "1-10 how favorable the state is" },
                      risk_level: { type: "string", enum: ["low", "medium", "high"] },
                      key_insight: { type: "string", description: "Most important insight about this lead" },
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

    const scoring = JSON.parse(toolCall.function.arguments);

    // Upsert the score
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

    return new Response(JSON.stringify(scoreData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-lead-scoring error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
