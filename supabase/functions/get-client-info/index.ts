import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP from headers (Supabase/Deno Deploy forwards these)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Use free ip-api.com for geolocation (no key needed, 45 req/min)
    let geo: Record<string, unknown> = {};
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org`);
      const geoData = await geoRes.json();
      if (geoData.status === "success") {
        geo = {
          country: geoData.country,
          country_code: geoData.countryCode,
          region: geoData.regionName,
          region_code: geoData.region,
          city: geoData.city,
          zip: geoData.zip,
          latitude: geoData.lat,
          longitude: geoData.lon,
          timezone: geoData.timezone,
          isp: geoData.isp,
          org: geoData.org,
        };
      }
    } catch (geoError) {
      console.error("Geo lookup failed:", geoError);
    }

    return new Response(
      JSON.stringify({ ip_address: ip, geolocation: geo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
