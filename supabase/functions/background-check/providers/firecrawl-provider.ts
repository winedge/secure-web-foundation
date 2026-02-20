// Firecrawl-powered background check provider
// Scrapes free public databases then uses AI to structure findings

interface LeadInfo {
  fullName: string;
  location: string;
  state: string;
  city: string;
  tortType: string;
  ageBucket: string;
}

const PUBLIC_SOURCES = [
  {
    name: "OFAC Sanctions Search",
    url: "https://sanctionssearch.ofac.treas.gov/",
    category: "sanctions",
  },
  {
    name: "National Sex Offender Registry",
    url: "https://www.nsopw.gov/",
    category: "sex_offender",
  },
  {
    name: "Federal Court Records (PACER)",
    url: "https://pcl.uscourts.gov/pcl/pages/search/findCase.jsf",
    category: "court_records",
  },
  {
    name: "FBI Most Wanted",
    url: "https://www.fbi.gov/wanted",
    category: "watchlist",
  },
];

function getStateCourtUrl(state: string): { name: string; url: string } {
  const stateUrls: Record<string, string> = {
    "FL": "https://www.flcourts.gov/Resources-Services/Court-Improvement/Public-Access-to-Court-Records",
    "CA": "https://www.courts.ca.gov/find-a-court.htm",
    "TX": "https://www.txcourts.gov/judicial-directory/",
    "NY": "https://iapps.courts.state.ny.us/webcivil/ecourtsMain",
    "IL": "https://www.illinoiscourts.gov/",
    "PA": "https://ujsportal.pacourts.us/",
    "OH": "https://www.supremecourt.ohio.gov/JCS/casemng/",
    "GA": "https://www.georgiacourts.gov/",
    "NJ": "https://www.njcourts.gov/",
    "NC": "https://www.nccourts.gov/court-dates",
  };
  const url = stateUrls[state] || `https://www.google.com/search?q=${encodeURIComponent(state + " state court records search")}`;
  return { name: `${state} State Court Records`, url };
}

async function scrapeSource(url: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.warn(`Firecrawl scrape failed for ${url}: ${response.status}`);
      return "";
    }

    const data = await response.json();
    // Truncate to keep token usage manageable
    const markdown = data?.data?.markdown || data?.markdown || "";
    return markdown.slice(0, 3000);
  } catch (err) {
    console.warn(`Firecrawl error for ${url}:`, err);
    return "";
  }
}

async function searchPublicRecords(name: string, state: string, apiKey: string): Promise<string[]> {
  const queries = [
    `${name} ${state} court records`,
    `${name} ${state} bankruptcy filing`,
    `${name} criminal records ${state}`,
  ];

  const results: string[] = [];

  for (const query of queries) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 3,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const items = data?.data || [];
        for (const item of items) {
          const snippet = `[${item.title || "Result"}](${item.url || ""}):\n${(item.markdown || item.description || "").slice(0, 1500)}`;
          results.push(snippet);
        }
      }
    } catch (err) {
      console.warn(`Search error for "${query}":`, err);
    }
  }

  return results;
}

export async function runFirecrawlBackgroundCheck(lead: LeadInfo) {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    throw new Error("Firecrawl connector not configured. Please enable the Firecrawl connector in Settings.");
  }

  console.log(`Running Firecrawl background check for ${lead.fullName}`);

  // Scrape public sources in parallel
  const scrapeTasks = PUBLIC_SOURCES.map(src => scrapeSource(src.url, firecrawlKey));
  const stateCourtInfo = getStateCourtUrl(lead.state);
  scrapeTasks.push(scrapeSource(stateCourtInfo.url, firecrawlKey));

  const [ofacContent, nsopwContent, pacerContent, fbiContent, stateCourtContent] =
    await Promise.all(scrapeTasks);

  // Search for the person in public records
  const searchResults = await searchPublicRecords(lead.fullName, lead.state, firecrawlKey);

  // Build context from scraped data
  const scrapedContext = `
## OFAC Sanctions Database Content:
${ofacContent || "Unable to retrieve - search manually"}

## National Sex Offender Registry Content:
${nsopwContent || "Unable to retrieve - search manually"}

## Federal Court Records (PACER) Content:
${pacerContent || "Unable to retrieve - search manually"}

## FBI Wanted List Content:
${fbiContent || "Unable to retrieve - search manually"}

## ${lead.state} State Court Records Content:
${stateCourtContent || "Unable to retrieve - search manually"}

## Public Record Search Results for "${lead.fullName}" in ${lead.state}:
${searchResults.length > 0 ? searchResults.join("\n\n---\n\n") : "No specific results found in web search"}`.trim();

  // Now use AI to analyze the scraped data
  const prompt = `You are a legal background intelligence analyst. I have scraped the following REAL data from public databases for a person named "${lead.fullName}" located in ${lead.location}, ${lead.state}. Their case involves ${lead.tortType}.

SCRAPED PUBLIC DATA:
${scrapedContext}

IMPORTANT INSTRUCTIONS:
1. Analyze the scraped data above to determine if there are ANY actual matches or relevant findings for this specific person.
2. Do NOT fabricate or simulate findings. If the scraped data does not contain specific records matching this person, mark those sections as "not found" with details about what was searched.
3. For each source, note what was actually found vs. what was searched but came back empty.
4. The sources MUST reference the actual URLs that were searched (provided above).
5. Be honest about limitations - if a database couldn't be fully searched, say so.

Lead Info:
- Name: ${lead.fullName}
- Location: ${lead.location}
- State: ${lead.state}
- Tort Type: ${lead.tortType}
- Age Bucket: ${lead.ageBucket}

Return the result in this JSON format:

{
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "overallScore": <number 0-100, where 100 is lowest risk>,
  "bankruptcyCheck": { "found": <bool>, "count": <num>, "details": "<what was actually found or not found>", "chapters": [], "mostRecent": null, "history": [], "sources": [{"name": "<source>", "url": "<actual URL searched>", "description": "<what was searched and found>"}] },
  "criminalCheck": { "felonies": <bool>, "misdemeanors": <bool>, "felonyCount": <num>, "misdemeanorCount": <num>, "details": "<str>", "charges": [], "history": [], "sources": [] },
  "civilLitigationCheck": { "found": <bool>, "count": <num>, "details": "<str>", "types": [], "history": [], "sources": [] },
  "creditRiskIndicator": { "level": "excellent"|"good"|"fair"|"poor"|"very_poor", "estimatedRange": "<str>", "details": "<str>", "flags": [], "publicRecords": [], "sources": [] },
  "sanctionsCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "identityVerification": { "verified": <bool>, "confidence": <num>, "flags": [], "details": "<str>", "addressHistory": [], "sources": [] },
  "sexOffenderRegistry": { "found": <bool>, "details": "<str>", "sources": [] },
  "watchlistCheck": { "found": <bool>, "details": "<str>", "lists": [], "sources": [] },
  "propertyRecords": { "found": <bool>, "count": <num>, "details": "<str>", "records": [], "sources": [] },
  "professionalLicenses": { "found": <bool>, "details": "<str>", "licenses": [], "sources": [] },
  "recommendation": "<3-4 sentence recommendation based on ACTUAL findings from scraped data>",
  "generatedAt": "${new Date().toISOString()}",
  "searchScope": "Live public records search via Firecrawl covering OFAC, NSOPW, PACER, FBI, ${lead.state} state courts, and web search results",
  "disclaimers": [
    "This report aggregates data from publicly accessible databases scraped in real-time.",
    "Results are NOT FCRA-compliant and should not be used for employment or tenancy decisions.",
    "Some databases may require manual verification for comprehensive results.",
    "This report does not constitute legal advice. All findings should be independently verified."
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
      temperature: 0.3,
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
