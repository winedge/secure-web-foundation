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

    const prompt = `You are a legal background intelligence analyst specializing in deep public records research. Given the following lead information, generate a HIGHLY DETAILED and comprehensive background check analysis. This is a SIMULATED analysis for a legal lead management platform.

Lead Info:
- Name: ${fullName}
- Location: ${location}
- State: ${lead.state || "Unknown"}
- Tort Type: ${lead.tort_type}
- Age Bucket: ${lead.age_bucket || "Unknown"}

CRITICAL REQUIREMENTS:

1. DETAILED HISTORY: For EVERY section where something is found, provide EXTENSIVE details:
   - Specific dates (month/year), case numbers, court names, jurisdictions
   - Dollar amounts for bankruptcies, judgments, liens
   - Specific charges with disposition (dismissed, convicted, plea deal, etc.)
   - Timeline of events showing progression
   - Names of courts, judges (if relevant), and filing details

2. ACCURATE SOURCE URLS: Do NOT just link to a website's homepage. Link to the SPECIFIC search page or query URL where one would actually look up this person. Examples:
   - PACER case search: "https://pcl.uscourts.gov/pcl/pages/search/findCase.jsf" (not just pacer.gov)
   - ${lead.state || "State"} court records search: Use the actual state judiciary case search URL
   - OFAC sanctions search: "https://sanctionssearch.ofac.treas.gov/Content/search.html" (the actual search page)
   - Sex offender registry: "https://www.nsopw.gov/search-public-sex-offender-registries" (the search page)
   - Credit bureaus: "https://www.annualcreditreport.com/index.action"
   - ${lead.state || "State"} DOC inmate search: Use the real state DOC inmate lookup URL
   - County clerk records: Use the actual county clerk online records search URL for ${lead.city || "the city"}, ${lead.state || "the state"}
   - Federal bankruptcy: "https://www.uscourts.gov/court-records/find-case-pacer"
   - State bar complaints: Use the actual state bar lookup URL

3. For each source, the "description" field must explain EXACTLY what was searched, what parameters were used, and what the finding was. Example: "Searched ${lead.state} Circuit Court electronic records for '${fullName}' from 2010-present. Found 1 civil case filed 03/2019, Case No. 2019-CV-004521, ${lead.city} County Circuit Court."

4. REALISM: 
   - ~70% of people should come back mostly clean with minor items
   - ~20% should have 1-2 notable findings (old misdemeanor, dismissed civil case, chapter 7 from 8+ years ago)
   - ~10% should have significant findings
   - Always include at least some detail even for clean checks (e.g., "Searched X database covering Y years, no records found matching criteria")

5. Each section MUST have 2-4 sources with SPECIFIC search URLs (not homepages)

Return the result in this JSON format:

{
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "overallScore": <number 0-100, where 100 is lowest risk>,
  "bankruptcyCheck": {
    "found": <boolean>,
    "count": <number>,
    "details": "<DETAILED paragraph: if found, include filing date, case number, court, chapter type, discharge date, total debt amount, current status. If not found, state the search scope and date range covered>",
    "chapters": [],
    "mostRecent": "<year or null>",
    "history": [{"date": "<MM/YYYY>", "event": "<specific event description with case numbers>", "court": "<full court name>", "amount": "<dollar amount if applicable>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC search/query page URL, NOT homepage>", "description": "<detailed description of what was searched and found>"}]
  },
  "criminalCheck": {
    "felonies": <boolean>,
    "misdemeanors": <boolean>,
    "felonyCount": <number>,
    "misdemeanorCount": <number>,
    "details": "<DETAILED paragraph: include jurisdiction, specific charges, dates, case numbers, dispositions, sentences if any. If clean, describe scope of search>",
    "charges": [],
    "history": [{"date": "<MM/YYYY>", "charge": "<specific charge>", "jurisdiction": "<court/county>", "caseNumber": "<case number>", "disposition": "<outcome>", "sentence": "<if applicable>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC search page URL>", "description": "<detailed search description>"}]
  },
  "civilLitigationCheck": {
    "found": <boolean>,
    "count": <number>,
    "details": "<DETAILED paragraph with case types, parties, outcomes, amounts>",
    "types": [],
    "history": [{"date": "<MM/YYYY>", "caseType": "<type>", "caseNumber": "<number>", "court": "<court>", "parties": "<plaintiff v defendant>", "status": "<outcome/pending>", "amount": "<if applicable>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC search page URL>", "description": "<detailed search description>"}]
  },
  "creditRiskIndicator": {
    "level": "excellent" | "good" | "fair" | "poor" | "very_poor",
    "estimatedRange": "<e.g. 720-750>",
    "details": "<DETAILED paragraph about credit indicators, any public financial records, tax liens, judgments>",
    "flags": [],
    "publicRecords": [{"type": "<lien/judgment/etc>", "date": "<MM/YYYY>", "amount": "<dollar amount>", "status": "<active/released>", "jurisdiction": "<where filed>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC URL>", "description": "<detailed search description>"}]
  },
  "sanctionsCheck": {
    "found": <boolean>,
    "details": "<detailed search description even if clear>",
    "lists": [],
    "sources": [{"name": "<source>", "url": "<SPECIFIC search page URL>", "description": "<what lists were checked>"}]
  },
  "identityVerification": {
    "verified": <boolean>,
    "confidence": <number 0-100>,
    "flags": [],
    "details": "<detailed verification steps and results>",
    "addressHistory": [{"address": "<partial address, city, state>", "dateRange": "<YYYY-YYYY>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC URL>", "description": "<verification method details>"}]
  },
  "sexOffenderRegistry": {
    "found": <boolean>,
    "details": "<detailed search scope description>",
    "sources": [{"name": "<source>", "url": "<SPECIFIC search page URL>", "description": "<search parameters used>"}]
  },
  "watchlistCheck": {
    "found": <boolean>,
    "details": "<detailed search scope>",
    "lists": [],
    "sources": [{"name": "<source>", "url": "<SPECIFIC search page URL>", "description": "<lists checked and results>"}]
  },
  "propertyRecords": {
    "found": <boolean>,
    "count": <number>,
    "details": "<property ownership details if any>",
    "records": [{"type": "<residential/commercial>", "location": "<city, state>", "estimatedValue": "<dollar amount>", "acquired": "<year>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC URL>", "description": "<search details>"}]
  },
  "professionalLicenses": {
    "found": <boolean>,
    "details": "<any professional licenses found>",
    "licenses": [{"type": "<license type>", "status": "<active/expired/revoked>", "issuedBy": "<issuing body>", "number": "<license number>"}],
    "sources": [{"name": "<source>", "url": "<SPECIFIC URL>", "description": "<search details>"}]
  },
  "recommendation": "<3-4 sentence detailed recommendation for the law firm based on all findings, including specific risk factors and suggested next steps>",
  "generatedAt": "${new Date().toISOString()}",
  "searchScope": "National multi-jurisdictional search covering federal and ${lead.state || 'state'} records, 7-year lookback for most categories, 10-year for criminal",
  "disclaimers": [
    "This is an AI-generated analysis for screening purposes only and does not constitute a certified background check.",
    "Results are simulated based on publicly available data patterns and should be verified through FCRA-compliant background check services.",
    "This report does not constitute legal advice. All findings should be independently verified before making legal or business decisions.",
    "Search covers federal and state-level databases. County-level records may require separate searches for comprehensive coverage."
  ]
}

Return ONLY valid JSON, no markdown fences.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
