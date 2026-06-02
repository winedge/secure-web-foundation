export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Detect upstream rate-limit / transient errors (e.g. Meta Graph API) and
// return them as HTTP 200 with a structured body so the supabase.functions.invoke
// client doesn't surface them as a "non-2xx" runtime error and blank the UI.
// The client can still check `error` / `rate_limited` / `fallback` flags.
const RATE_LIMIT_PATTERNS = [
  /too many calls/i,
  /rate.?limit/i,
  /request limit reached/i,
  /user request limit/i,
  /\(#?(?:4|17|32|613|80000|80001|80002|80003|80004|80008|80014)\)/,
];

export function errorResponse(message: string, status = 400): Response {
  const isRateLimit = RATE_LIMIT_PATTERNS.some((re) => re.test(message));
  if (isRateLimit) {
    return jsonResponse(
      { error: message, rate_limited: true, fallback: true },
      200,
    );
  }
  return jsonResponse({ error: message }, status);
}
