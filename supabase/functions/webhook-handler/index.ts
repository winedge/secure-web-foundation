import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

interface CallDispositionPayload {
  type: 'call_disposition';
  lead_id?: string;
  contact_id?: string;
  external_id?: string;
  outcome: string;
  duration_seconds?: number;
  notes?: string;
  agent_id?: string;
  timestamp?: string;
}

interface StatusUpdatePayload {
  type: 'status_update';
  lead_id?: string;
  contact_id?: string;
  external_id?: string;
  new_status: string;
  previous_status?: string;
  reason?: string;
}

interface NotePayload {
  type: 'note';
  lead_id?: string;
  contact_id?: string;
  external_id?: string;
  title?: string;
  content: string;
}

interface CRMSyncPayload {
  type: 'crm_sync';
  action: 'create' | 'update' | 'delete';
  entity_type: 'lead' | 'contact' | 'deal';
  external_id: string;
  data: Record<string, unknown>;
}

type WebhookPayload = CallDispositionPayload | StatusUpdatePayload | NotePayload | CRMSyncPayload;

async function findLeadByExternalId(supabase: any, externalId: string): Promise<string | undefined> {
  const { data } = await supabase.from('leads').select('id').eq('external_id', externalId).single();
  return data?.id;
}

async function findContactByExternalId(supabase: any, externalId: string): Promise<string | undefined> {
  const { data } = await supabase.from('contacts').select('id').eq('external_id', externalId).single();
  return data?.id;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = createSupabaseClient(true);

    // Verify webhook secret (mandatory)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.warn('Invalid or missing webhook secret');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', payload.type);

    switch (payload.type) {
      case 'call_disposition': {
        const p = payload as CallDispositionPayload;
        let leadId = p.lead_id;
        let contactId = p.contact_id;
        
        if (!leadId && !contactId && p.external_id) {
          leadId = await findLeadByExternalId(supabase, p.external_id);
          contactId = await findContactByExternalId(supabase, p.external_id);
        }

        if (!leadId && !contactId) return jsonResponse({ error: 'Lead or contact not found' }, 404);

        const { error: touchpointError } = await supabase.from('touchpoints').insert({
          lead_id: leadId, contact_id: contactId, touchpoint_type: 'call',
          direction: 'outbound', channel: 'phone', outcome: p.outcome,
          duration_seconds: p.duration_seconds, content: p.notes,
          completed_at: p.timestamp || new Date().toISOString(),
          metadata: { agent_id: p.agent_id },
        });
        if (touchpointError) throw touchpointError;

        if (p.notes) {
          await supabase.from('notes').insert({
            lead_id: leadId, contact_id: contactId,
            title: `Call - ${p.outcome}`, content: p.notes,
          });
        }
        break;
      }

      case 'status_update': {
        const p = payload as StatusUpdatePayload;
        let leadId = p.lead_id;
        let contactId = p.contact_id;
        
        if (!leadId && !contactId && p.external_id) {
          leadId = await findLeadByExternalId(supabase, p.external_id);
          contactId = await findContactByExternalId(supabase, p.external_id);
        }

        if (!leadId && !contactId) return jsonResponse({ error: 'Lead or contact not found' }, 404);

        const { error: statusError } = await supabase.from('lead_statuses').insert({
          lead_id: leadId, contact_id: contactId,
          status: p.new_status, previous_status: p.previous_status,
          change_reason: p.reason,
        });
        if (statusError) throw statusError;

        if (contactId) {
          const validStatuses = ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'do_not_contact'];
          if (validStatuses.includes(p.new_status)) {
            await supabase.from('contacts').update({ status: p.new_status }).eq('id', contactId);
          }
        }

        await supabase.from('touchpoints').insert({
          lead_id: leadId, contact_id: contactId, touchpoint_type: 'status_change',
          content: `Status changed from ${p.previous_status || 'unknown'} to ${p.new_status}`,
          metadata: { reason: p.reason },
        });
        break;
      }

      case 'note': {
        const p = payload as NotePayload;
        let leadId = p.lead_id;
        let contactId = p.contact_id;
        
        if (!leadId && !contactId && p.external_id) {
          leadId = await findLeadByExternalId(supabase, p.external_id);
          contactId = await findContactByExternalId(supabase, p.external_id);
        }

        if (!leadId && !contactId) return jsonResponse({ error: 'Lead or contact not found' }, 404);

        const { error: noteError } = await supabase.from('notes').insert({
          lead_id: leadId, contact_id: contactId,
          title: p.title, content: p.content,
        });
        if (noteError) throw noteError;

        await supabase.from('touchpoints').insert({
          lead_id: leadId, contact_id: contactId,
          touchpoint_type: 'note', content: p.content,
        });
        break;
      }

      case 'crm_sync': {
        const p = payload as CRMSyncPayload;
        console.log(`CRM sync: ${p.action} ${p.entity_type} ${p.external_id}`);

        // Explicit allowlist of fields a CRM webhook may set on leads.
        // Prevents mass-assignment of trust/pricing fields like is_verified,
        // ai_quality_score, tier, price, status, etc.
        const ALLOWED_LEAD_FIELDS = new Set([
          'first_name', 'last_name', 'email', 'phone',
          'city', 'state', 'zip_code', 'address',
          'tort_type', 'category', 'notes', 'metadata',
        ]);
        const sanitize = (data: Record<string, unknown>) =>
          Object.fromEntries(
            Object.entries(data || {}).filter(([k]) => ALLOWED_LEAD_FIELDS.has(k))
          );

        if (p.entity_type === 'lead') {
          if (p.action === 'create' || p.action === 'update') {
            const safeData = sanitize(p.data);
            const existingLeadId = await findLeadByExternalId(supabase, p.external_id);

            if (existingLeadId) {
              await supabase.from('leads')
                .update({ ...safeData, updated_at: new Date().toISOString() })
                .eq('id', existingLeadId);
            } else if (p.action === 'create' && p.data.state && p.data.tort_type) {
              await supabase.from('leads').insert({
                external_id: p.external_id,
                ...safeData,
                state: (p.data.state as string),
                tort_type: (p.data.tort_type as string),
                price: 300,
                status: 'available',
              });
            }
          }
        }
        break;
      }

      default:
        return jsonResponse({ error: 'Unknown webhook type' }, 400);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
