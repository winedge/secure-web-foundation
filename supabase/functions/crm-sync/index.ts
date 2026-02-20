import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createSupabaseClient, getAuthenticatedUser, createLogger } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const log = createLogger("crm-sync");

// Default field mappings for known CRMs
const CRM_DEFAULTS: Record<string, Record<string, string>> = {
  hubspot: {
    first_name: "firstname",
    last_name: "lastname",
    email: "email",
    phone: "phone",
    state: "state",
    tort_type: "case_type",
    ai_quality_score: "lead_score",
    tier: "lead_tier",
  },
  salesforce: {
    first_name: "FirstName",
    last_name: "LastName",
    email: "Email",
    phone: "Phone",
    state: "State",
    tort_type: "Case_Type__c",
    ai_quality_score: "Lead_Score__c",
    tier: "Lead_Tier__c",
  },
  zoho: {
    first_name: "First_Name",
    last_name: "Last_Name",
    email: "Email",
    phone: "Phone",
    state: "State",
    tort_type: "Case_Type",
    ai_quality_score: "Lead_Score",
    tier: "Lead_Tier",
  },
  clio: {
    first_name: "first_name",
    last_name: "last_name",
    email: "email",
    phone: "phone_number",
    state: "state",
    tort_type: "practice_area",
  },
};

function mapLeadToCRM(lead: Record<string, any>, fieldMapping: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [leadField, crmField] of Object.entries(fieldMapping)) {
    if (lead[leadField] !== undefined && lead[leadField] !== null) {
      mapped[crmField] = lead[leadField];
    }
  }
  return mapped;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = createSupabaseClient(true);
    const anonClient = createSupabaseClient(false);
    const user = await getAuthenticatedUser(req, anonClient);

    const { action, integration_id, lead_id, lead_ids } = await req.json();

    if (action === "test") {
      // Test connection
      if (!integration_id) return errorResponse("integration_id required");

      const { data: integration, error } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("id", integration_id)
        .single();

      if (error || !integration) return errorResponse("Integration not found", 404);

      const config = integration.config as Record<string, any>;
      const webhookUrl = config?.webhook_url;

      if (!webhookUrl) return errorResponse("No webhook URL configured");

      try {
        const testPayload = { test: true, source: "leadthru", timestamp: new Date().toISOString() };
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (config.auth_header) headers["Authorization"] = config.auth_header;

        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
        });

        return jsonResponse({
          success: resp.ok,
          status: resp.status,
          message: resp.ok ? "Connection test successful" : `Test failed: HTTP ${resp.status}`,
        });
      } catch (e) {
        return jsonResponse({ success: false, message: `Connection failed: ${(e as Error).message}` });
      }
    }

    if (action === "sync") {
      if (!integration_id) return errorResponse("integration_id required");

      const { data: integration } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("id", integration_id)
        .single();

      if (!integration) return errorResponse("Integration not found", 404);

      const config = integration.config as Record<string, any>;
      const webhookUrl = config?.webhook_url;
      if (!webhookUrl) return errorResponse("No webhook URL configured");

      // Get field mapping (use defaults if not custom)
      const fieldMapping = Object.keys(integration.field_mapping || {}).length > 0
        ? integration.field_mapping as Record<string, string>
        : CRM_DEFAULTS[integration.crm_type] || {};

      // Get leads to sync
      const idsToSync = lead_ids || (lead_id ? [lead_id] : []);
      if (idsToSync.length === 0) return errorResponse("No leads specified");

      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .in("id", idsToSync);

      if (!leads || leads.length === 0) return errorResponse("No leads found");

      const results: any[] = [];
      let successCount = 0;
      let failCount = 0;

      for (const lead of leads) {
        const mappedData = mapLeadToCRM(lead, fieldMapping);
        mappedData._source = "leadthru";
        mappedData._lead_id = lead.id;

        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (config.auth_header) headers["Authorization"] = config.auth_header;

          const resp = await fetch(webhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(mappedData),
          });

          const respBody = await resp.text();
          const status = resp.ok ? "success" : "failed";
          if (resp.ok) successCount++; else failCount++;

          await supabase.from("crm_sync_logs").insert({
            integration_id,
            firm_id: integration.firm_id,
            lead_id: lead.id,
            sync_type: "push",
            status,
            request_payload: mappedData,
            response_payload: { status: resp.status, body: respBody.slice(0, 500) },
            error_message: resp.ok ? null : `HTTP ${resp.status}`,
          });

          results.push({ lead_id: lead.id, status });
        } catch (e) {
          failCount++;
          await supabase.from("crm_sync_logs").insert({
            integration_id,
            firm_id: integration.firm_id,
            lead_id: lead.id,
            sync_type: "push",
            status: "failed",
            error_message: (e as Error).message,
          });
          results.push({ lead_id: lead.id, status: "failed", error: (e as Error).message });
        }
      }

      // Update integration stats
      await supabase
        .from("crm_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          total_synced: (integration.total_synced || 0) + successCount,
          total_failed: (integration.total_failed || 0) + failCount,
        })
        .eq("id", integration_id);

      return jsonResponse({ results, success_count: successCount, fail_count: failCount });
    }

    return errorResponse("Invalid action. Use 'test' or 'sync'.");
  } catch (err) {
    log("Error", { error: (err as Error).message });
    return errorResponse((err as Error).message, 500);
  }
});
