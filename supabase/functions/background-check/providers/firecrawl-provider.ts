// Firecrawl-powered background check provider
// Uses web search to find real public records, then AI to structure findings

interface LeadInfo {
  fullName: string;
  location: string;
  state: string;
  city: string;
  tortType: string;
  ageBucket: string;
}

const SEARCH_QUERIES_FOR_LEAD = (name: string, state: string, city: string) => [
  `"${name}" ${state} court records case filing`,
  `"${name}" ${state} bankruptcy filing public record`,
  `"${name}" ${state} criminal records arrest`,
  `"${name}" ${city} ${state} civil lawsuit litigation`,
  `"${name}" OFAC sanctions list`,
  `"${name}" sex offender registry ${state}`,
];

const PUBLIC_SOURCE_URLS = [
  { name: "OFAC Sanctions Search", url: "https://sanctionssearch.ofac.treas.gov/", category: "sanctions" },
  { name: "National Sex Offender Registry", url: "https://www.nsopw.gov/", category: "sex_offender" },
  { name: "Federal Court Records (PACER)", url: "https://pcl.uscourts.gov/", category: "court_records" },
  { name: "FBI Most Wanted", url: "https://www.fbi.gov/wanted", category: "watchlist" },
];

function getStateCourtUrl(state: string): string {
  const stateUrls: Record<string, string> = {
    FL: "https://www.flcourts.gov/",
    CA: "https://www.courts.ca.gov/",
    TX: "https://www.txcourts.gov/",
    NY: "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
    IL: "https://www.illinoiscourts.gov/",
    PA: "https://ujsportal.pacourts.us/",
    OH: "https://www.supremecourt.ohio.gov/",
    GA: "https://www.georgiacourts.gov/",
    NJ: "https://www.njcourts.gov/",
    NC: "https://www.nccourts.gov/",
  };
  return stateUrls[state] || "";
}

async function firecrawlSearch(query: string, apiKey: string, limit = 5): Promise<any[]> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!response.ok) {
      console.warn(`Firecrawl search failed for "${query}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data?.data || [];
  } catch (err) {
    console.warn(`Firecrawl search error for "${query}":`, err);
    return [];
  }
}

export async function runFirecrawlBackgroundCheck(lead: LeadInfo) {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    throw new Error("Firecrawl connector not configured. Please enable the Firecrawl connector in Settings.");
  }

  console.log(`Running Firecrawl background check for ${lead.fullName}`);

  const queries = SEARCH_QUERIES_FOR_LEAD(lead.fullName, lead.state, lead.city);

  // Run all searches in parallel
  const searchPromises = queries.map((q) => firecrawlSearch(q, firecrawlKey, 5));
  const allResults = await Promise.all(searchPromises);

  // Flatten and deduplicate by URL
  const seen = new Set<string>();
  const uniqueResults: { query: string; title: string; url: string; snippet: string }[] = [];

  queries.forEach((query, i) => {
    for (const item of allResults[i]) {
      const url = item.url || "";
      if (url && !seen.has(url)) {
        seen.add(url);
        uniqueResults.push({
          query,
          title: item.title || "Untitled",
          url,
          snippet: (item.markdown || item.description || "").slice(0, 2000),
        });
      }
    }
  });

  console.log(`Found ${uniqueResults.length} unique results across ${queries.length} searches`);

  // Build search results context for AI
  const searchContext = uniqueResults.length > 0
    ? uniqueResults.map((r, i) => `### Result ${i + 1} (Query: "${r.query}")\n**Source:** [${r.title}](${r.url})\n${r.snippet}`).join("\n\n---\n\n")
    : "No specific public records found for this individual in web search.";

  // Build list of official databases that should be checked manually
  const stateCourtUrl = getStateCourtUrl(lead.state);
  const officialSources = PUBLIC_SOURCE_URLS.map((s) => `- [${s.name}](${s.url})`).join("\n");
  const stateCourtNote = stateCourtUrl ? `- [${lead.state} State Courts](${stateCourtUrl})` : `- ${lead.state} State Courts (URL not mapped)`;

  const prompt = `You are a legal background intelligence analyst. Analyze the following REAL web search results gathered for "${lead.fullName}" in ${lead.city}, ${lead.state}. Their case involves ${lead.tortType}.

## WEB SEARCH RESULTS
${searchContext}

## OFFICIAL DATABASES (for reference — could not be searched programmatically, note this in your report)
${officialSources}
${stateCourtNote}

## CRITICAL INSTRUCTIONS
1. ONLY report findings that are actually present in the search results above.
2. If a search result clearly references this person (matching name AND location/state), report it as a finding.
3. If results are ambiguous (common name, unclear match), flag them as "possible match — requires manual verification".
4. Do NOT fabricate or assume any records. If nothing was found, say "No records found in automated search."
5. For databases that couldn't be searched automatically (OFAC, NSOPW, PACER), note they require manual lookup.
6. Every finding MUST include the actual source URL from the search results.

## LEAD INFO
- Name: ${lead.fullName}
- Location: ${lead.city}, ${lead.state}
- Tort Type: ${lead.tortType}
- Age Bucket: ${lead.ageBucket}

Return ONLY valid JSON (no markdown fences) in this format:

{
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "overallScore": <0-100, 100=lowest risk>,
  "bankruptcyCheck": { "found": <bool>, "count": <num>, "details": "<str>", "chapters": [], "mostRecent": null, "history": [], "sources": [{"name":"<source>","url":"<url>","description":"<what was found>"}] },
  "criminalCheck": { "felonies": <bool>, "misdemeanors": <bool>, "felonyCount": <num>, "misdemeanorCount": <num>, "details": "<str>", "charges": [], "history": [], "sources": [] },
  "civilLitigationCheck": { "found": <bool>, "count": <num>, "details": "<str>", "types": [], "history": [], "sources": [] },
  "creditRiskIndicator": { "level": "excellent"|"good"|"fair"|"poor"|"very_poor", "estimatedRange": "<str>", "details": "<str>", "flags": [], "publicRecords": [], "sources": [] },
  "sanctionsCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "identityVerification": { "verified": <bool>, "confidence": <num>, "flags": [], "details": "<str>", "addressHistory": [], "sources": [] },
  "sexOffenderRegistry": { "found": <bool>, "details": "<str>", "sources": [] },
  "watchlistCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "propertyRecords": { "found": <bool>, "count": <num>, "details": "<str>", "records": [], "sources": [] },
  "professionalLicenses": { "found": <bool>, "details": "<str>", "licenses": [], "sources": [] },
  "recommendation": "<3-4 sentence recommendation based ONLY on actual findings>",
  "generatedAt": "${new Date().toISOString()}",
  "searchScope": "Web search via Firecrawl for public records. Official databases (OFAC, NSOPW, PACER, FBI, ${lead.state} courts) require manual verification.",
  "disclaimers": [
    "Results are based on automated web searches and may not be comprehensive.",
    "Official government databases (OFAC, NSOPW, PACER) require manual lookup for definitive results.",
    "Name matches may be coincidental — verify identity before acting on findings.",
    "This report is NOT FCRA-compliant and should not be used for employment or tenancy decisions.",
    "All findings should be independently verified by qualified legal professionals."
  ]
}`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error("AI API error:", errText);
    throw new Error(`AI analysis failed: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}
