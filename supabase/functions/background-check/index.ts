import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

// Provider-specific modules
import { runAIBackgroundCheck } from "./providers/ai-provider.ts";
import { runFirecrawlBackgroundCheck } from "./providers/firecrawl-provider.ts";
import { runCheckrBackgroundCheck } from "./providers/checkr-provider.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { lead_id, provider = "firecrawl" } = await req.json();
    if (!lead_id) return errorResponse("lead_id is required");

    // Auth
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return errorResponse("Unauthorized", 401);

    // Service role client
    const adminClient = createSupabaseClient(true);

    const { data: lead, error: leadError } = await adminClient
      .from("leads")
      .select("first_name, last_name, state, city, email, phone, tort_type, age_bucket")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) return errorResponse("Lead not found", 404);

    const leadInfo = {
      fullName: `${lead.first_name || "Unknown"} ${lead.last_name || ""}`.trim(),
      location: `${lead.city || ""}, ${lead.state || ""}`.replace(/^, |, $/g, ""),
      state: lead.state || "Unknown",
      city: lead.city || "",
      tortType: lead.tort_type,
      ageBucket: lead.age_bucket || "Unknown",
      email: lead.email,
      phone: lead.phone,
    };

    let result: any;

    switch (provider) {
      case "firecrawl":
        result = await runFirecrawlBackgroundCheck(leadInfo);
        break;
      case "checkr":
        result = await runCheckrBackgroundCheck(leadInfo);
        break;
      case "ai":
      default:
        result = await runAIBackgroundCheck(leadInfo);
        break;
    }

    // Log the check
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "background_check",
      entity_type: "lead",
      entity_id: lead_id,
      details: { risk_level: result.overallRiskLevel, score: result.overallScore, provider },
    });

    return jsonResponse({ result, provider });
  } catch (error) {
    console.error("Background check error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
