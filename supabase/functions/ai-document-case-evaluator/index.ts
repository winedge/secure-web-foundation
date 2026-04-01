import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: firmMember } = await supabase
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", user.id)
      .single();

    if (!firmMember) {
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

    // Truncate to ~15000 chars to stay within AI context limits
    const truncatedText = document_text.substring(0, 15000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an expert legal case evaluator specializing in mass tort litigation and personal injury law. 

Evaluate the following document and provide a thorough case evaluation. Extract all relevant details about the case including:
- The type of tort/injury/claim
- Jurisdiction/state information
- Patient/plaintiff details (age, medical conditions, exposure)
- Evidence quality and documentation
- Potential defendants
- Relevant timelines

Document (file: ${file_name || "uploaded document"}):
---
${truncatedText}
---

Based on this document, provide a comprehensive case evaluation using the evaluate_case tool. If information is missing, note it in your analysis and adjust scores accordingly.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a legal case evaluation AI. Always use the provided tool to return structured analysis. Be thorough and realistic in your assessments." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_case",
              description: "Return comprehensive case viability evaluation based on the uploaded document",
              parameters: {
                type: "object",
                properties: {
                  case_summary: { type: "string", description: "Brief 2-3 sentence summary of the case from the document" },
                  tort_type: { type: "string", description: "Identified tort type (e.g. medical malpractice, personal injury, product liability)" },
                  jurisdiction: { type: "string", description: "Identified jurisdiction/state" },
                  viability_score: { type: "number", description: "0-100 case viability score" },
                  settlement_estimate_low: { type: "number", description: "Low end settlement estimate in USD" },
                  settlement_estimate_high: { type: "number", description: "High end settlement estimate in USD" },
                  strengths: { type: "array", items: { type: "string" }, description: "Case strengths (3-5 items)" },
                  weaknesses: { type: "array", items: { type: "string" }, description: "Case weaknesses (2-4 items)" },
                  recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations (3-5 items)" },
                  jurisdiction_notes: { type: "string", description: "Notes about the jurisdiction's stance on this type of case" },
                  statute_of_limitations: { type: "string", description: "Relevant statute of limitations info" },
                  similar_cases_summary: { type: "string", description: "Brief summary of similar precedent cases" },
                  key_evidence: { type: "array", items: { type: "string" }, description: "Key pieces of evidence identified in the document" },
                  missing_information: { type: "array", items: { type: "string" }, description: "Important information that is missing from the document" },
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

    // AI Transparency logging
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("ai_transparency_logs").insert({
      firm_id: firmMember.firm_id,
      action_type: "document_case_evaluation",
      model_name: "google/gemini-2.5-flash",
      model_version: "latest",
      input_summary: `Document case evaluation: ${file_name || "uploaded document"} (${truncatedText.length} chars)`,
      output_summary: `Viability: ${evaluation.viability_score}%, Tort: ${evaluation.tort_type}, Settlement: $${evaluation.settlement_estimate_low}-$${evaluation.settlement_estimate_high}`,
      confidence_score: evaluation.viability_score,
      decision_factors: { file_name, tort_type: evaluation.tort_type, jurisdiction: evaluation.jurisdiction },
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
