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

    const { document_id } = await req.json();
    if (!document_id) throw new Error("Missing document_id");

    // Get the document record
    const { data: doc, error: docError } = await supabase
      .from("document_analyses")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docError) throw docError;

    // Get the lead data if linked
    let leadContext = "";
    if (doc.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("tort_type, state, first_name, last_name, diagnosis_details, exposure_details")
        .eq("id", doc.lead_id)
        .single();
      if (lead) {
        leadContext = `\nLinked Lead: ${lead.first_name} ${lead.last_name}, Tort: ${lead.tort_type}, State: ${lead.state}, Diagnosis: ${lead.diagnosis_details || "N/A"}, Exposure: ${lead.exposure_details || "N/A"}`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analyze this legal document and extract structured information.

Document: "${doc.file_name}" (Type: ${doc.document_type})
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
          { role: "system", content: "You are a legal document analyzer specializing in mass tort cases. Extract key facts, flag statute of limitations risks, and identify fields that can auto-populate case records." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_document",
            description: "Return structured document analysis",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence summary of the document" },
                extracted_facts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", description: "e.g. Diagnosis, Treatment, Exposure, Timeline, Damages" },
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
                  properties: {
                    diagnosis_details: { type: "string" },
                    exposure_details: { type: "string" },
                    age_bucket: { type: "string" },
                    state: { type: "string" }
                  },
                  additionalProperties: false
                },
                document_type_detected: { type: "string", description: "medical_record, police_report, intake_form, legal_filing, other" }
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

    // Update the document record
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
