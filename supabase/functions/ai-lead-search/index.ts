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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get firm
    const { data: firmMember } = await supabase
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", user.id)
      .single();

    if (!firmMember) {
      return new Response(JSON.stringify({ error: "No firm found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch all purchased leads for this firm
    const { data: purchases } = await supabase
      .from("lead_purchases")
      .select("lead_id, pipeline_stage")
      .eq("firm_id", firmMember.firm_id);

    if (!purchases || purchases.length === 0) {
      return new Response(JSON.stringify({ results: [], interpretation: { tags: [], summary: "No leads found" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadIds = purchases.map((p: any) => p.lead_id);

    // Use service role to fetch lead data
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: leads } = await serviceClient
      .from("leads")
      .select("id, tort_type, state, age_bucket, ai_quality_score, fraud_risk_score, tier, first_name, last_name, diagnosis_details, exposure_details, metadata, created_at, price")
      .in("id", leadIds);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ results: [], interpretation: { tags: [], summary: "No leads found" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build lead summaries for AI
    const leadSummaries = leads.map((l: any, i: number) => {
      const parts = [
        `[${i}] ID:${l.id}`,
        `Tort:${l.tort_type}`,
        `State:${l.state}`,
        l.age_bucket ? `Age:${l.age_bucket}` : null,
        l.ai_quality_score != null ? `QScore:${l.ai_quality_score}` : null,
        l.tier ? `Tier:${l.tier}` : null,
        l.first_name ? `Name:${l.first_name} ${l.last_name || ""}` : null,
        l.diagnosis_details ? `Diagnosis:${l.diagnosis_details.substring(0, 100)}` : null,
        l.exposure_details ? `Exposure:${l.exposure_details.substring(0, 100)}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    });

    // Limit to 50 leads for AI processing
    const maxLeads = Math.min(leads.length, 50);
    const truncatedSummaries = leadSummaries.slice(0, maxLeads);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an AI lead search and ranking engine for a legal lead management platform. 
You receive a natural language search query and a list of leads. Your job is to:

1. Parse the user's intent (what tort type, location, conditions, qualities they're looking for)
2. Score each lead 0-100 based on semantic relevance to the query
3. Provide a brief explanation for each scored lead
4. Extract query interpretation tags

IMPORTANT RULES:
- This is SOFT ranking, NOT hard filtering. Never completely exclude leads.
- Leads that partially match should get moderate scores (30-60).
- Leads that don't match at all should still get low scores (5-20).
- Perfect matches get 85-100.
- Consider synonyms, related terms, and fuzzy matching.

Respond using the suggest_leads tool.`;

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
          {
            role: "user",
            content: `Search query: "${query}"

Leads to rank:
${truncatedSummaries.join("\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_leads",
              description: "Return ranked leads with relevance scores and interpretation tags",
              parameters: {
                type: "object",
                properties: {
                  interpretation: {
                    type: "object",
                    properties: {
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Key concepts extracted from query (e.g. 'Ozempic', 'Florida', 'High BMI')",
                      },
                      summary: {
                        type: "string",
                        description: "One-line summary of what the user is searching for",
                      },
                    },
                    required: ["tags", "summary"],
                  },
                  ranked_leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Index of the lead from the input list" },
                        relevance_score: { type: "number", description: "0-100 relevance score" },
                        match_reason: { type: "string", description: "Brief explanation of why this lead matches (max 50 chars)" },
                      },
                      required: ["index", "relevance_score", "match_reason"],
                    },
                  },
                },
                required: ["interpretation", "ranked_leads"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_leads" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI search failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI returned no results" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const { interpretation, ranked_leads } = parsed;

    // Map AI results back to lead IDs
    const results = (ranked_leads || [])
      .filter((r: any) => r.index >= 0 && r.index < leads.length)
      .map((r: any) => ({
        lead_id: leads[r.index].id,
        relevance_score: Math.min(100, Math.max(0, r.relevance_score)),
        match_reason: r.match_reason || "",
      }))
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score);

    // AI Transparency logging
    const topResults = results.slice(0, 5);
    serviceClient.from("ai_transparency_logs").insert({
      firm_id: firmMember.firm_id,
      action_type: "search_ranking",
      model_name: "google/gemini-3-flash-preview",
      input_summary: `Search query: "${query}" across ${leads.length} leads`,
      output_summary: `Returned ${results.length} ranked results. Top match: ${topResults[0]?.relevance_score || 0}%`,
      confidence_score: topResults[0]?.relevance_score || 0,
      decision_factors: { query, total_leads: leads.length, results_returned: results.length, tags: interpretation.tags },
      compliant_frameworks: ["ABA-512", "GDPR", "EU-AI-Act"],
    }).then(() => {}).catch(() => {}); // Non-blocking

    return new Response(JSON.stringify({ results, interpretation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-lead-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
