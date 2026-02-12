import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient, createLogger } from "../_shared/auth.ts";

const log = createLogger("LEAD-NOTIFICATION");

interface MatchedFirm {
  firm_id: string;
  firm_name: string;
  match_score: number;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    log("Function started");

    const supabase = createSupabaseClient(true);
    const { lead_id, matches } = await req.json() as {
      lead_id: string;
      matches: MatchedFirm[];
    };

    if (!lead_id || !matches?.length) {
      return jsonResponse({ error: "lead_id and matches required" }, 400);
    }

    log("Processing notifications", { lead_id, matchCount: matches.length });

    // Get lead details
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("tort_type, state, tier, price, ai_quality_score")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) {
      log("Lead not found", { lead_id, error: leadErr?.message });
      return jsonResponse({ error: "Lead not found" }, 404);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      log("RESEND_API_KEY not set");
      return jsonResponse({ error: "Email service not configured" }, 500);
    }

    const firmIds = matches.map((m) => m.firm_id);

    // Get notification preferences for matched firms
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("firm_id, notify_new_leads, notify_email, tort_types, states")
      .in("firm_id", firmIds);

    // Get firm contact emails as fallback
    const { data: firms } = await supabase
      .from("firms")
      .select("id, name, contact_email")
      .in("id", firmIds);

    const firmMap = new Map(
      (firms || []).map((f: any) => [f.id, f])
    );

    let sent = 0;
    let skipped = 0;

    for (const match of matches) {
      const pref = prefs?.find((p: any) => p.firm_id === match.firm_id);
      const firm = firmMap.get(match.firm_id);

      // Skip if notifications disabled
      if (pref && !pref.notify_new_leads) {
        skipped++;
        continue;
      }

      // Skip if tort type filter set and doesn't match
      if (pref?.tort_types?.length && !pref.tort_types.includes(lead.tort_type)) {
        skipped++;
        continue;
      }

      // Skip if state filter set and doesn't match
      if (pref?.states?.length && !pref.states.includes(lead.state)) {
        skipped++;
        continue;
      }

      const email = pref?.notify_email || firm?.contact_email;
      if (!email) {
        log("No email for firm", { firm_id: match.firm_id });
        skipped++;
        continue;
      }

      const tierColors: Record<string, string> = {
        A: "#10b981",
        B: "#0ea5e9",
        C: "#f59e0b",
        D: "#ef4444",
      };

      const tierColor = tierColors[lead.tier] || "#6b7280";

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "LeadsThru <notifications@leadsthru.com>",
            to: [email],
            subject: `🔔 New ${lead.tier}-Tier ${lead.tort_type} Lead in ${lead.state}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1a1f2e, #2a3040); padding: 24px; border-radius: 12px; color: white; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 22px;">New Lead Match</h1>
                  <p style="margin: 8px 0 0; opacity: 0.8;">A new lead matching your criteria is available</p>
                </div>
                
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Tort Type</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${lead.tort_type}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">State</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${lead.state}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Tier</td>
                      <td style="padding: 8px 0; text-align: right;">
                        <span style="background: ${tierColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 13px;">${lead.tier}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Quality Score</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${lead.ai_quality_score}/100</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Price</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #10b981;">$${lead.price}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Match Score</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right;">${match.match_score}%</td>
                    </tr>
                  </table>
                </div>

                <a href="https://snuggle-site-synth.lovable.app/marketplace" 
                   style="display: block; background: #10b981; color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View in Marketplace →
                </a>
                
                <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
                  You're receiving this because your firm "${match.firm_name}" has lead alerts enabled.
                </p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          sent++;
          log("Email sent", { firm_id: match.firm_id, email });
        } else {
          const errText = await res.text();
          log("Email send failed", { firm_id: match.firm_id, error: errText });
        }
      } catch (emailErr) {
        log("Email error", {
          firm_id: match.firm_id,
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
        });
      }
    }

    log("Notifications complete", { sent, skipped });
    return jsonResponse({ sent, skipped });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
