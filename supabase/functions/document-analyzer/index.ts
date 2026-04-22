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

    const { document_id } = await req.json();
    if (!document_id) throw new Error("Missing document_id");

    const { data: doc, error: docError } = await supabase
      .from("document_analyses")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docError) throw docError;

    let leadContext = "";
    let firmId: string | null = doc.firm_id ?? null;
    if (doc.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("tort_type, category, state, first_name, last_name, diagnosis_details, exposure_details, custom_fields")
        .eq("id", doc.lead_id)
        .single();
      if (lead) {
        leadContext = `\nLinked Record: ${lead.first_name} ${lead.last_name}, Category: ${lead.category || lead.tort_type}, State: ${lead.state}, Notes: ${lead.diagnosis_details || lead.exposure_details || JSON.stringify(lead.custom_fields || {})}`;
      }
    }

    // Vertical-aware prompt
    const { prompt: customPrompt, verticalSlug } = await getVerticalContext(firmId, "document");
    const systemPrompt = buildSystemPrompt("document", verticalSlug, customPrompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Analyze this document and extract structured information.

Document: "${doc.file_name}" (Type: ${doc.document_type})
Vertical: ${verticalSlug}
${leadContext}

Use the analyze_document tool to return your analysis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_document",
            description: "Return structured document analysis tailored to the vertical",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence summary of the document" },
                extracted_facts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", description: "Vertical-specific category, e.g. Diagnosis/Treatment for legal/clinic, Property Details for real estate, Site Specs for solar" },
                      fact: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      page_reference: { type: "string" }
                    },
                    required: ["category", "fact", "confidence"],
                    additionalProperties: false
                  }
                },
                statute_risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk_type: { type: "string" },
                      description: { type: "string" },
                      severity: { type: "string", enum: ["critical", "warning", "info"] },
                      deadline: { type: "string" }
                    },
                    required: ["risk_type", "description", "severity"],
                    additionalProperties: false
                  }
                },
                auto_populated_fields: {
                  type: "object",
                  description: "Fields that can be auto-populated on the linked record",
                  additionalProperties: true
                },
                document_type_detected: { type: "string", description: "Vertical-appropriate type, e.g. medical_record/police_report/intake_form for legal; consultation_form/treatment_plan for clinic; property_deed/inspection_report for real estate; site_survey/utility_bill for solar; estimate/work_order for home services" }
              },
              required: ["summary", "extracted_facts", "statute_risks", "auto_populated_fields", "document_type_detected"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_document" } },
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

    const analysis = JSON.parse(toolCall.function.arguments);

    const { data: updated, error: updateError } = await supabase
      .from("document_analyses")
      .update({
        extracted_facts: analysis.extracted_facts,
        statute_risks: analysis.statute_risks,
        auto_populated_fields: analysis.auto_populated_fields,
        ai_summary: analysis.summary,
        document_type: analysis.document_type_detected,
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("document-analyzer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
