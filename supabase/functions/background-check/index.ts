import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient, getAuthenticatedUser } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { lead_id } = await req.json();
    if (!lead_id) return errorResponse("lead_id is required");

    // Auth via shared helper
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );

    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return errorResponse("Unauthorized", 401);

    // Service role client for data access
    const adminClient = createSupabaseClient(true);

    const { data: lead, error: leadError } = await adminClient
      .from("leads")
      .select("first_name, last_name, state, city, email, phone, tort_type, age_bucket")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) return errorResponse("Lead not found", 404);

    const fullName = `${lead.first_name || "Unknown"} ${lead.last_name || ""}`.trim();
    const location = `${lead.city || ""}, ${lead.state || ""}`.replace(/^, |, $/g, "");

    const prompt = `You are a legal background intelligence analyst. Given the following lead information, generate a realistic and comprehensive background check analysis. This is a SIMULATED analysis for a legal lead management platform.

Lead Info:
- Name: ${fullName}
- Location: ${location}
- Tort Type: ${lead.tort_type}
- Age Bucket: ${lead.age_bucket || "Unknown"}

Generate a detailed background check result in the following JSON format. Make the results realistic — most people should come back clean, but occasionally include minor findings. The results should feel authentic:

{
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "overallScore": <number 0-100, where 100 is lowest risk>,
  "bankruptcyCheck": {
    "found": <boolean>,
    "count": <number>,
    "details": "<one sentence summary>",
    "chapters": ["Chapter 7", "Chapter 13"] or [],
    "mostRecent": "<year or null>"
  },
  "criminalCheck": {
    "felonies": <boolean>,
    "misdemeanors": <boolean>,
    "felonyCount": <number>,
    "misdemeanorCount": <number>,
    "details": "<one sentence summary>",
    "charges": [] or ["charge description"]
  },
  "civilLitigationCheck": {
    "found": <boolean>,
    "count": <number>,
    "details": "<one sentence summary>",
    "types": [] or ["Personal Injury", "Contract Dispute"]
  },
  "creditRiskIndicator": {
    "level": "excellent" | "good" | "fair" | "poor" | "very_poor",
    "details": "<one sentence summary>",
    "flags": [] or ["flag descriptions"]
  },
  "sanctionsCheck": {
    "found": <boolean>,
    "details": "<one sentence summary>",
    "lists": []
  },
  "identityVerification": {
    "verified": <boolean>,
    "confidence": <number 0-100>,
    "flags": [] or ["flag"],
    "details": "<one sentence summary>"
  },
  "sexOffenderRegistry": {
    "found": <boolean>,
    "details": "<one sentence summary>"
  },
  "watchlistCheck": {
    "found": <boolean>,
    "details": "<one sentence summary>",
    "lists": []
  },
  "recommendation": "<2-3 sentence recommendation for the law firm>",
  "disclaimers": [
    "This is an AI-generated analysis for screening purposes only.",
    "Results should be verified through official background check services before making legal decisions.",
    "This report does not constitute legal advice or a certified background check."
  ]
}

Return ONLY valid JSON, no markdown fences.`;

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const result = JSON.parse(content);

    // Log the check
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "background_check",
      entity_type: "lead",
      entity_id: lead_id,
      details: { risk_level: result.overallRiskLevel, score: result.overallScore },
    });

    return jsonResponse({ result });
  } catch (error) {
    console.error("Background check error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
