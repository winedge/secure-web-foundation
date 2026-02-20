import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createSupabaseClient, createLogger } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const log = createLogger("fraud-detection");

interface FraudSignal {
  check_type: string;
  severity: string;
  details: Record<string, unknown>;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient(true);
    const { lead_id } = await req.json();

    if (!lead_id) return errorResponse("lead_id is required");

    log("Starting fraud analysis", { lead_id });

    // Fetch the lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) return errorResponse("Lead not found", 404);

    const signals: FraudSignal[] = [];

    // 1. LEAD FARMING: same email/phone submitting many leads in short time
    if (lead.email) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("email", lead.email)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if ((count ?? 0) >= 5) {
        signals.push({
          check_type: "lead_farming",
          severity: (count ?? 0) >= 10 ? "critical" : "high",
          details: { email: lead.email, submissions_24h: count, threshold: 5 },
        });
      }
    }

    if (lead.phone) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("phone", lead.phone)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if ((count ?? 0) >= 5) {
        signals.push({
          check_type: "lead_farming",
          severity: (count ?? 0) >= 10 ? "critical" : "high",
          details: { phone: lead.phone, submissions_24h: count, threshold: 5 },
        });
      }
    }

    // 2. BOT SUBMISSION: missing key fields, suspicious metadata
    const botIndicators: string[] = [];
    if (!lead.first_name && !lead.last_name) botIndicators.push("missing_name");
    if (!lead.email && !lead.phone) botIndicators.push("missing_contact");
    if (!lead.diagnosis_details && !lead.exposure_details) botIndicators.push("missing_case_details");

    const metadata = lead.metadata || {};
    if (metadata.submission_time_ms && metadata.submission_time_ms < 3000) {
      botIndicators.push("fast_submission");
    }
    if (metadata.honeypot_filled) {
      botIndicators.push("honeypot_triggered");
    }

    if (botIndicators.length >= 2) {
      signals.push({
        check_type: "bot_submission",
        severity: botIndicators.includes("honeypot_triggered") ? "critical" : "high",
        details: { indicators: botIndicators, count: botIndicators.length },
      });
    }

    // 3. RECYCLED LEAD: exact duplicate by email+tort_type or phone+tort_type
    if (lead.email) {
      const { data: dupes } = await supabase
        .from("leads")
        .select("id, created_at, status")
        .eq("email", lead.email)
        .eq("tort_type", lead.tort_type)
        .neq("id", lead_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (dupes && dupes.length > 0) {
        const purchased = dupes.filter((d: any) => d.status === "purchased");
        signals.push({
          check_type: "recycled_lead",
          severity: purchased.length > 0 ? "high" : "medium",
          details: {
            duplicate_count: dupes.length,
            previously_purchased: purchased.length,
            original_ids: dupes.map((d: any) => d.id).slice(0, 3),
          },
        });
      }
    }

    // 4. VELOCITY ABUSE: too many leads from same source in short period
    if (lead.source_id) {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("source_id", lead.source_id)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if ((count ?? 0) >= 20) {
        signals.push({
          check_type: "velocity_abuse",
          severity: (count ?? 0) >= 50 ? "critical" : "high",
          details: { source_id: lead.source_id, leads_per_hour: count, threshold: 20 },
        });
      }
    }

    // Insert fraud checks and auto-flag if needed
    if (signals.length > 0) {
      const inserts = signals.map((s) => ({ lead_id, ...s }));
      await supabase.from("fraud_checks").insert(inserts);

      // Auto-flag the lead if any high/critical signals
      const hasCritical = signals.some((s) => s.severity === "critical" || s.severity === "high");
      if (hasCritical) {
        await supabase
          .from("leads")
          .update({
            status: "flagged",
            fraud_risk_score: Math.min(100, signals.length * 25 + (hasCritical ? 30 : 0)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead_id);

        log("Lead auto-flagged", { lead_id, signal_count: signals.length });
      }
    }

    log("Fraud analysis complete", { lead_id, signals_found: signals.length });

    return jsonResponse({
      lead_id,
      signals_found: signals.length,
      signals,
      action: signals.some((s) => s.severity === "critical" || s.severity === "high")
        ? "flagged"
        : signals.length > 0
        ? "warning"
        : "clean",
    });
  } catch (err) {
    log("Error", { error: (err as Error).message });
    return errorResponse((err as Error).message, 500);
  }
});
