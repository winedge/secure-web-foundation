import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret',
};

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

// deno-lint-ignore no-explicit-any
async function findLeadByExternalId(
  supabase: any,
  externalId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('external_id', externalId)
    .single();
  if (data && typeof data === 'object' && 'id' in data) {
    return (data as { id: string }).id;
  }
  return undefined;
}

// deno-lint-ignore no-explicit-any
async function findContactByExternalId(
  supabase: any,
  externalId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .eq('external_id', externalId)
    .single();
  if (data && typeof data === 'object' && 'id' in data) {
    return (data as { id: string }).id;
  }
  return undefined;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify webhook secret (optional but recommended)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', payload.type);

    switch (payload.type) {
      case 'call_disposition': {
        const p = payload as CallDispositionPayload;
        
        // Find lead or contact
        let leadId = p.lead_id;
        let contactId = p.contact_id;
        
        if (!leadId && !contactId && p.external_id) {
          leadId = await findLeadByExternalId(supabase, p.external_id);
          contactId = await findContactByExternalId(supabase, p.external_id);
        }

        if (!leadId && !contactId) {
          return new Response(
            JSON.stringify({ error: 'Lead or contact not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create touchpoint for call
        const { error: touchpointError } = await supabase
          .from('touchpoints')
          .insert({
            lead_id: leadId,
            contact_id: contactId,
            touchpoint_type: 'call',
            direction: 'outbound',
            channel: 'phone',
            outcome: p.outcome,
            duration_seconds: p.duration_seconds,
            content: p.notes,
            completed_at: p.timestamp || new Date().toISOString(),
            metadata: { agent_id: p.agent_id },
          });

        if (touchpointError) {
          console.error('Touchpoint insert error:', touchpointError);
          throw touchpointError;
        }

        // If notes provided, also create a note
        if (p.notes) {
          await supabase.from('notes').insert({
            lead_id: leadId,
            contact_id: contactId,
            title: `Call - ${p.outcome}`,
            content: p.notes,
          });
        }

        console.log('Call disposition processed successfully');
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

        if (!leadId && !contactId) {
          return new Response(
            JSON.stringify({ error: 'Lead or contact not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create status history entry
        const { error: statusError } = await supabase
          .from('lead_statuses')
          .insert({
            lead_id: leadId,
            contact_id: contactId,
            status: p.new_status,
            previous_status: p.previous_status,
            change_reason: p.reason,
          });

        if (statusError) {
          console.error('Status insert error:', statusError);
          throw statusError;
        }

        // Update contact status if applicable
        if (contactId) {
          const validStatuses = ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'do_not_contact'];
          if (validStatuses.includes(p.new_status)) {
            await supabase
              .from('contacts')
              .update({ status: p.new_status })
              .eq('id', contactId);
          }
        }

        // Create touchpoint for status change
        await supabase.from('touchpoints').insert({
          lead_id: leadId,
          contact_id: contactId,
          touchpoint_type: 'status_change',
          content: `Status changed from ${p.previous_status || 'unknown'} to ${p.new_status}`,
          metadata: { reason: p.reason },
        });

        console.log('Status update processed successfully');
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

        if (!leadId && !contactId) {
          return new Response(
            JSON.stringify({ error: 'Lead or contact not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: noteError } = await supabase
          .from('notes')
          .insert({
            lead_id: leadId,
            contact_id: contactId,
            title: p.title,
            content: p.content,
          });

        if (noteError) {
          console.error('Note insert error:', noteError);
          throw noteError;
        }

        // Also create touchpoint
        await supabase.from('touchpoints').insert({
          lead_id: leadId,
          contact_id: contactId,
          touchpoint_type: 'note',
          content: p.content,
        });

        console.log('Note processed successfully');
        break;
      }

      case 'crm_sync': {
        const p = payload as CRMSyncPayload;
        console.log(`CRM sync: ${p.action} ${p.entity_type} ${p.external_id}`);

        if (p.entity_type === 'lead') {
          if (p.action === 'create' || p.action === 'update') {
            const existingLeadId = await findLeadByExternalId(supabase, p.external_id);
            
            if (existingLeadId) {
              // Update existing lead
              await supabase
                .from('leads')
                .update({
                  ...p.data,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingLeadId);
            } else if (p.action === 'create') {
              // Create new lead - needs required fields
              if (p.data.state && p.data.tort_type) {
                await supabase.from('leads').insert({
                  external_id: p.external_id,
                  state: p.data.state as string,
                  tort_type: p.data.tort_type as string,
                  price: (p.data.price as number) || 300,
                  status: 'available',
                  ...p.data,
                });
              }
            }
          }
        }

        console.log('CRM sync processed successfully');
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown webhook type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
