import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    let geo: Record<string, unknown> = {};
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org`);
      const geoData = await geoRes.json();
      if (geoData.status === "success") {
        geo = {
          country: geoData.country, country_code: geoData.countryCode,
          region: geoData.regionName, region_code: geoData.region,
          city: geoData.city, zip: geoData.zip,
          latitude: geoData.lat, longitude: geoData.lon,
          timezone: geoData.timezone, isp: geoData.isp, org: geoData.org,
        };
      }
    } catch (geoError) {
      console.error("Geo lookup failed:", geoError);
    }

    return jsonResponse({ ip_address: ip, geolocation: geo });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
