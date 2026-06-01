// supabase/functions/meta-targeting-search/index.ts
// Proxies Meta Marketing API targeting & geo search, with curated fallback when
// no Facebook access token is connected for the firm.
//
// Operations (POST body { op, ... }):
//   - search_targeting { q, types?: string[], locales?: string[] }
//   - search_geo       { q, types?: string[] }
//   - list_custom_audiences { firm_id }
//
// Auth: requires a logged-in Supabase user; resolves their firm's Facebook token
// from `platform_connections` where platform='facebook'. Falls back to the
// curated dataset if no token is available so the UI is always usable.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

/* ──────────── Curated fallback catalogs ────────────
   Mirrors common Meta Detailed Targeting entries so the picker still works
   without a connected Meta account. Each entry uses Meta's id where known. */
const FALLBACK_INTERESTS: Array<{
  id: string; name: string; type: string; path: string[]; audience_size?: number;
}> = [
  { id: "6003107902433", name: "Personal injury law", type: "interests", path: ["Interests", "Business", "Law"], audience_size: 18000000 },
  { id: "6003020834693", name: "Lawyer", type: "interests", path: ["Demographics", "Work", "Job titles"], audience_size: 4200000 },
  { id: "6003248338078", name: "Legal services", type: "interests", path: ["Interests", "Business"], audience_size: 32000000 },
  { id: "6003020834694", name: "Social Security", type: "interests", path: ["Interests", "Government"], audience_size: 9500000 },
  { id: "6003251723552", name: "Insurance", type: "interests", path: ["Interests", "Finance"], audience_size: 220000000 },
  { id: "6003397425735", name: "Health insurance", type: "interests", path: ["Interests", "Finance"], audience_size: 95000000 },
  { id: "6003107952751", name: "Medicare", type: "interests", path: ["Interests", "Health"], audience_size: 25000000 },
  { id: "6003248338079", name: "Solar energy", type: "interests", path: ["Interests", "Energy"], audience_size: 18000000 },
  { id: "6003251723555", name: "Home improvement", type: "interests", path: ["Interests", "Home"], audience_size: 110000000 },
  { id: "6003020834699", name: "Real estate", type: "interests", path: ["Interests", "Real estate"], audience_size: 250000000 },
  { id: "6002868298343", name: "First-time home buyer", type: "behaviors", path: ["Behaviors", "Residential profiles"], audience_size: 7600000 },
  { id: "6003397425738", name: "New movers", type: "behaviors", path: ["Behaviors", "Residential profiles"], audience_size: 4100000 },
  { id: "6003397425736", name: "Small business owners", type: "behaviors", path: ["Behaviors", "Work"], audience_size: 12000000 },
  { id: "6003397425737", name: "Frequent travelers", type: "behaviors", path: ["Behaviors", "Travel"], audience_size: 84000000 },
  { id: "6003107952752", name: "Engaged shoppers", type: "behaviors", path: ["Behaviors", "Purchase behavior"], audience_size: 460000000 },
  { id: "6003251723556", name: "Dental care", type: "interests", path: ["Interests", "Health"], audience_size: 25000000 },
  { id: "6003251723557", name: "Cosmetic dentistry", type: "interests", path: ["Interests", "Health"], audience_size: 6200000 },
  { id: "6003251723558", name: "Personal finance", type: "interests", path: ["Interests", "Finance"], audience_size: 78000000 },
  { id: "6003251723559", name: "Investing", type: "interests", path: ["Interests", "Finance"], audience_size: 142000000 },
  { id: "6003251723560", name: "Home buyers", type: "behaviors", path: ["Behaviors", "Residential profiles"], audience_size: 11000000 },
  { id: "6003251723561", name: "Mortgage", type: "interests", path: ["Interests", "Finance"], audience_size: 38000000 },
  { id: "6003251723562", name: "Veterans (US)", type: "behaviors", path: ["Behaviors", "Demographics"], audience_size: 9400000 },
  { id: "6003251723563", name: "Parents (all)", type: "demographics", path: ["Demographics", "Parents"], audience_size: 240000000 },
  { id: "6003251723564", name: "Engaged (1 year)", type: "demographics", path: ["Demographics", "Relationship"], audience_size: 12000000 },
];

const FALLBACK_GEOS: Array<{
  key: string; name: string; type: string; country_code?: string; region?: string;
}> = [
  { key: "US", name: "United States", type: "country", country_code: "US" },
  { key: "CA", name: "Canada", type: "country", country_code: "CA" },
  { key: "GB", name: "United Kingdom", type: "country", country_code: "GB" },
  { key: "AU", name: "Australia", type: "country", country_code: "AU" },
  { key: "DE", name: "Germany", type: "country", country_code: "DE" },
  { key: "FR", name: "France", type: "country", country_code: "FR" },
  { key: "IN", name: "India", type: "country", country_code: "IN" },
  { key: "BR", name: "Brazil", type: "country", country_code: "BR" },
  { key: "MX", name: "Mexico", type: "country", country_code: "MX" },
  { key: "ES", name: "Spain", type: "country", country_code: "ES" },
  { key: "IT", name: "Italy", type: "country", country_code: "IT" },
  { key: "NL", name: "Netherlands", type: "country", country_code: "NL" },
  { key: "AE", name: "United Arab Emirates", type: "country", country_code: "AE" },
  { key: "SG", name: "Singapore", type: "country", country_code: "SG" },
  { key: "JP", name: "Japan", type: "country", country_code: "JP" },
  // Cities (US)
  { key: "miami_fl", name: "Miami, Florida", type: "city", country_code: "US", region: "Florida" },
  { key: "houston_tx", name: "Houston, Texas", type: "city", country_code: "US", region: "Texas" },
  { key: "new_york_ny", name: "New York, New York", type: "city", country_code: "US", region: "New York" },
  { key: "los_angeles_ca", name: "Los Angeles, California", type: "city", country_code: "US", region: "California" },
  { key: "chicago_il", name: "Chicago, Illinois", type: "city", country_code: "US", region: "Illinois" },
  { key: "phoenix_az", name: "Phoenix, Arizona", type: "city", country_code: "US", region: "Arizona" },
  { key: "atlanta_ga", name: "Atlanta, Georgia", type: "city", country_code: "US", region: "Georgia" },
  { key: "dallas_tx", name: "Dallas, Texas", type: "city", country_code: "US", region: "Texas" },
  { key: "denver_co", name: "Denver, Colorado", type: "city", country_code: "US", region: "Colorado" },
  { key: "seattle_wa", name: "Seattle, Washington", type: "city", country_code: "US", region: "Washington" },
  // International cities
  { key: "london_gb", name: "London, England", type: "city", country_code: "GB", region: "England" },
  { key: "paris_fr", name: "Paris, France", type: "city", country_code: "FR", region: "Île-de-France" },
  { key: "berlin_de", name: "Berlin, Germany", type: "city", country_code: "DE", region: "Berlin" },
  { key: "mumbai_in", name: "Mumbai, India", type: "city", country_code: "IN", region: "Maharashtra" },
  { key: "delhi_in", name: "Delhi, India", type: "city", country_code: "IN", region: "Delhi" },
  { key: "bangalore_in", name: "Bangalore, India", type: "city", country_code: "IN", region: "Karnataka" },
  { key: "dubai_ae", name: "Dubai, UAE", type: "city", country_code: "AE", region: "Dubai" },
  { key: "sydney_au", name: "Sydney, Australia", type: "city", country_code: "AU", region: "New South Wales" },
  { key: "toronto_ca", name: "Toronto, Ontario", type: "city", country_code: "CA", region: "Ontario" },
  { key: "tokyo_jp", name: "Tokyo, Japan", type: "city", country_code: "JP", region: "Tokyo" },
  // US Regions/states
  { key: "florida", name: "Florida", type: "region", country_code: "US" },
  { key: "texas", name: "Texas", type: "region", country_code: "US" },
  { key: "california", name: "California", type: "region", country_code: "US" },
  { key: "new_york", name: "New York", type: "region", country_code: "US" },
];

function filterFallback<T extends { name: string }>(arr: T[], q: string, limit = 25): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return arr.slice(0, limit);
  return arr
    .filter((x) => x.name.toLowerCase().includes(needle))
    .slice(0, limit);
}

async function getFacebookToken(supabase: any, userId: string) {
  // Look up the user's firm, then their active Facebook connection.
  const { data: firmMember } = await supabase
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!firmMember?.firm_id) return null;

  const { data } = await supabase
    .from("platform_connections")
    .select("access_token, ad_account_id, metadata")
    .eq("firm_id", firmMember.firm_id)
    .eq("platform", "facebook")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const adAccountId =
    data.ad_account_id ||
    data.metadata?.ad_account_id ||
    null;
  return { access_token: data.access_token, ad_account_id: adAccountId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const op = body.op as string;
    const q = String(body.q || "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional: resolve user → firm → token. UI works without auth too (fallback).
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await userClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }
    const conn = userId ? await getFacebookToken(supabase, userId) : null;
    const token = conn?.access_token;
    const adAccountId = conn?.account_id;

    /* ─── 1. Detailed targeting search ─── */
    if (op === "search_targeting") {
      const types = (body.types as string[] | undefined) || [
        "adinterest", "adworkemployer", "adworkposition",
        "adeducationschool", "adeducationmajor",
      ];
      if (token) {
        try {
          const url = new URL(`${META_API}/search`);
          url.searchParams.set("type", "adinterest");
          url.searchParams.set("q", q || "a");
          url.searchParams.set("limit", "30");
          url.searchParams.set("access_token", token);
          const r = await fetch(url.toString());
          const j = await r.json();
          if (Array.isArray(j?.data)) {
            const items = j.data.map((d: any) => ({
              id: String(d.id),
              name: d.name,
              type: d.type || "interests",
              path: d.path || [d.topic].filter(Boolean),
              audience_size: d.audience_size || d.audience_size_lower_bound || null,
            }));
            return json({ items, source: "meta" });
          }
        } catch {
          // fall through to curated fallback
        }
      }
      return json({
        items: filterFallback(FALLBACK_INTERESTS, q),
        source: "fallback",
      });
    }

    /* ─── 2. Geo location search ─── */
    if (op === "search_geo") {
      const locationTypes = (body.types as string[] | undefined) || [
        "country", "region", "city", "subcity", "zip",
      ];
      if (token) {
        try {
          const url = new URL(`${META_API}/search`);
          url.searchParams.set("type", "adgeolocation");
          url.searchParams.set("q", q || "a");
          url.searchParams.set("location_types", JSON.stringify(locationTypes));
          url.searchParams.set("limit", "30");
          url.searchParams.set("access_token", token);
          const r = await fetch(url.toString());
          const j = await r.json();
          if (Array.isArray(j?.data)) {
            const items = j.data.map((d: any) => ({
              key: String(d.key),
              name: d.name + (d.region ? `, ${d.region}` : ""),
              type: d.type,
              country_code: d.country_code,
              region: d.region,
              supports_region: d.supports_region,
              supports_city: d.supports_city,
            }));
            return json({ items, source: "meta" });
          }
        } catch {
          // fall through
        }
      }
      return json({
        items: filterFallback(FALLBACK_GEOS, q),
        source: "fallback",
      });
    }

    /* ─── 3. Custom audiences list ─── */
    if (op === "list_custom_audiences") {
      if (token && adAccountId) {
        try {
          const url = new URL(`${META_API}/act_${adAccountId}/customaudiences`);
          url.searchParams.set("fields", "id,name,subtype,approximate_count_lower_bound,description");
          url.searchParams.set("limit", "100");
          url.searchParams.set("access_token", token);
          const r = await fetch(url.toString());
          const j = await r.json();
          if (Array.isArray(j?.data)) {
            return json({
              items: j.data.map((d: any) => ({
                id: String(d.id),
                name: d.name,
                subtype: d.subtype,
                size: d.approximate_count_lower_bound || null,
                description: d.description || null,
              })),
              source: "meta",
            });
          }
        } catch {
          // fall through
        }
      }
      // No connected ad account — return empty so UI can show "connect Meta" hint.
      return json({ items: [], source: "fallback" });
    }

    return json({ error: `Unknown op: ${op}` }, 400);
  } catch (e) {
    console.error("[meta-targeting-search]", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
