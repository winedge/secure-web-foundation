// Meta webhook receiver — scaffolded. User wires App ID + verify token in Meta App Dashboard later.
// GET = verification handshake. POST = event delivery (HMAC-SHA256 verification when META_APP_SECRET present).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";

async function verifySignature(payload: string, signatureHeader: string): Promise<boolean> {
  if (!APP_SECRET || !signatureHeader) return false;
  const expected = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // Verification handshake
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-hub-signature-256") ?? "";
  const valid = APP_SECRET ? await verifySignature(raw, sigHeader) : false;

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { /* keep empty */ }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      await supabase.from("meta_webhook_events").insert({
        object: payload.object ?? "unknown",
        field: change.field,
        meta_object_id: String(entry.id ?? change?.value?.ad_id ?? ""),
        signature_valid: valid,
        signature_header: sigHeader,
        payload: { entry, change },
      });

      // Enqueue lead processing for leadgen events
      if (change.field === "leadgen" && change?.value?.leadgen_id) {
        await supabase.rpc("meta_enqueue_job", {
          _job_type: "process_leadgen",
          _payload: { leadgen_id: change.value.leadgen_id, page_id: change.value.page_id, form_id: change.value.form_id },
          _priority: 3,
        });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, valid }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
