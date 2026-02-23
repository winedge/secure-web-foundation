// AI-only background check provider (simulated analysis via LLM)

interface LeadInfo {
  fullName: string;
  location: string;
  state: string;
  city: string;
  tortType: string;
  ageBucket: string;
}

export async function runAIBackgroundCheck(lead: LeadInfo) {
  const prompt = `You are a legal background intelligence analyst specializing in deep public records research. Given the following lead information, generate a HIGHLY DETAILED and comprehensive background check analysis. This is a SIMULATED analysis for a legal lead management platform.

Lead Info:
- Name: ${lead.fullName}
- Location: ${lead.location}
- State: ${lead.state}
- Tort Type: ${lead.tortType}
- Age Bucket: ${lead.ageBucket}

CRITICAL REQUIREMENTS:

1. DETAILED HISTORY: For EVERY section where something is found, provide EXTENSIVE details:
   - Specific dates (month/year), case numbers, court names, jurisdictions
   - Dollar amounts for bankruptcies, judgments, liens
   - Specific charges with disposition (dismissed, convicted, plea deal, etc.)

2. ACCURATE SOURCE URLS: Link to the SPECIFIC search page or query URL where one would actually look up this person.

3. REALISM: 
   - ~70% of people should come back mostly clean with minor items
   - ~20% should have 1-2 notable findings
   - ~10% should have significant findings

4. Each section MUST have 2-4 sources with SPECIFIC search URLs (not homepages)

Return the result in this JSON format:

{
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "overallScore": <number 0-100>,
  "bankruptcyCheck": { "found": <bool>, "count": <num>, "details": "<str>", "chapters": [], "mostRecent": "<year or null>", "history": [], "sources": [] },
  "criminalCheck": { "felonies": <bool>, "misdemeanors": <bool>, "felonyCount": <num>, "misdemeanorCount": <num>, "details": "<str>", "charges": [], "history": [], "sources": [] },
  "civilLitigationCheck": { "found": <bool>, "count": <num>, "details": "<str>", "types": [], "history": [], "sources": [] },
  "creditRiskIndicator": { "level": "excellent"|"good"|"fair"|"poor"|"very_poor", "estimatedRange": "<str>", "details": "<str>", "flags": [], "publicRecords": [], "sources": [] },
  "sanctionsCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "identityVerification": { "verified": <bool>, "confidence": <num>, "flags": [], "details": "<str>", "addressHistory": [], "sources": [] },
  "sexOffenderRegistry": { "found": <bool>, "details": "<str>", "sources": [] },
  "watchlistCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "propertyRecords": { "found": <bool>, "count": <num>, "details": "<str>", "records": [], "sources": [] },
  "professionalLicenses": { "found": <bool>, "details": "<str>", "licenses": [], "sources": [] },
  "recommendation": "<str>",
  "generatedAt": "${new Date().toISOString()}",
  "searchScope": "AI-simulated national multi-jurisdictional search",
  "disclaimers": [
    "This is an AI-generated simulated analysis for screening purposes only.",
    "Results should be verified through FCRA-compliant background check services.",
    "This report does not constitute legal advice."
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
  return JSON.parse(content);
}
