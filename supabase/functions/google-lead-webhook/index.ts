import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

// Shared-secret verification. Configure GOOGLE_WEBHOOK_SECRET in Supabase secrets
// and add the same value to Google Ads webhook config as a custom header `x-google-webhook-secret`
// (or the legacy `Google-Lead-Webhook-Key` Google parameter).
function verifyWebhookSecret(req: Request): boolean {
  const expected = Deno.env.get("GOOGLE_WEBHOOK_SECRET");
  if (!expected) {
    console.error("GOOGLE_WEBHOOK_SECRET not configured — refusing all requests");
    return false;
  }
  const provided =
    req.headers.get("x-google-webhook-secret") ||
    req.headers.get("google-lead-webhook-key") ||
    new URL(req.url).searchParams.get("secret");
  return provided === expected;
}

/**
 * Google Ads Lead Form Webhook
 * Receives leads from Google Ads Lead Form Extensions via webhook.
 * 
 * Google sends lead data via a configured webhook URL when a lead form is submitted.
 * The payload contains user-submitted form data.
 */

interface GoogleLeadData {
  lead_id?: string;
  form_id?: string;
  campaign_id?: string;
  gcl_id?: string;
  user_column_data?: Array<{
    column_id: string;
    string_value?: string;
    column_name?: string;
  }>;
  // Flat structure for simpler webhook integrations (Zapier, etc.)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tort_type?: string;
  [key: string]: unknown;
}

function calculateQualityScore(lead: Record<string, string | undefined>): number {
  let score = 50;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.first_name && lead.last_name) score += 5;
  if (lead.city) score += 3;
  if (lead.zip_code) score += 2;
  if (lead.state) score += 5;
  return Math.min(100, score);
}

function calculateTier(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function calculatePrice(tier: 'A' | 'B' | 'C' | 'D', tortType: string): number {
  const basePrices: Record<string, number> = {
    'Camp Lejeune': 500, 'Roundup': 400, 'Talcum Powder': 450,
    'AFFF': 550, 'Paraquat': 500, '3M Earplugs': 350,
  };
  const tierMultipliers: Record<string, number> = { 'A': 1.5, 'B': 1.0, 'C': 0.7, 'D': 0.4 };
  return Math.round((basePrices[tortType] || 400) * tierMultipliers[tier]);
}

function extractGoogleLeadFields(payload: GoogleLeadData): Record<string, string | undefined> {
  // If user_column_data exists (Google Ads native format), parse it
  if (payload.user_column_data && Array.isArray(payload.user_column_data)) {
    const fields: Record<string, string | undefined> = {};
    const fieldMap: Record<string, string> = {
      'FULL_NAME': 'full_name',
      'FIRST_NAME': 'first_name',
      'LAST_NAME': 'last_name',
      'EMAIL': 'email',
      'PHONE_NUMBER': 'phone',
      'CITY': 'city',
      'STATE': 'state',
      'POSTAL_CODE': 'zip_code',
      'COUNTRY': 'country',
    };
    
    for (const col of payload.user_column_data) {
      const mappedName = fieldMap[col.column_id] || col.column_name?.toLowerCase();
      if (mappedName) {
        fields[mappedName] = col.string_value;
      }
    }
    
    // Handle FULL_NAME split
    if (fields.full_name && !fields.first_name) {
      const parts = fields.full_name.split(' ');
      fields.first_name = parts[0];
      fields.last_name = parts.slice(1).join(' ') || undefined;
    }
    
    return fields;
  }
  
  // Flat structure (Zapier/Make integrations)
  return {
    first_name: payload.first_name as string | undefined,
    last_name: payload.last_name as string | undefined,
    email: payload.email as string | undefined,
    phone: payload.phone as string | undefined,
    city: payload.city as string | undefined,
    state: payload.state as string | undefined,
    zip_code: payload.zip_code as string | undefined,
    tort_type: payload.tort_type as string | undefined,
  };
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabase = createSupabaseClient(true);
    const payload: GoogleLeadData = await req.json();
    
    console.log('Google lead webhook received:', JSON.stringify(payload).slice(0, 500));

    // Check if lead verification is required
    const { data: verificationSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'lead_verification_required')
      .maybeSingle();
    
    const requiresVerification = verificationSetting?.value?.enabled === true;
    const initialStatus = requiresVerification ? 'pending_review' : 'available';

    // Get lead sources
    const { data: sources } = await supabase.from('lead_sources').select('id, source_type');
    const sourceMap = new Map((sources || []).map((s: any) => [s.source_type, s.id]));

    const leadFields = extractGoogleLeadFields(payload);
    
    // Dedup check
    if (leadFields.email || leadFields.phone) {
      let dupeQuery = supabase.from('leads').select('id');
      if (leadFields.email) dupeQuery = dupeQuery.eq('email', leadFields.email);
      else if (leadFields.phone) dupeQuery = dupeQuery.eq('phone', leadFields.phone);
      
      const { data: existingLead } = await dupeQuery.limit(1).maybeSingle();
      if (existingLead) {
        console.log('Duplicate lead detected from Google Ads');
        return jsonResponse({ success: true, duplicate: true, existing_id: existingLead.id });
      }
    }

    const tortType = leadFields.tort_type || 'General';
    const state = leadFields.state || 'Unknown';
    
    const qualityScore = calculateQualityScore(leadFields);
    const tier = calculateTier(qualityScore);
    const price = calculatePrice(tier, tortType);

    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        first_name: leadFields.first_name || null,
        last_name: leadFields.last_name || null,
        email: leadFields.email || null,
        phone: leadFields.phone || null,
        city: leadFields.city || null,
        state,
        zip_code: leadFields.zip_code || null,
        tort_type: tortType,
        ai_quality_score: qualityScore,
        tier,
        price,
        status: initialStatus,
        source: 'google_ads',
        source_id: sourceMap.get('google_ads') || null,
        external_id: payload.lead_id || payload.gcl_id || null,
        is_verified: false,
        is_exclusive: true,
        ingested_at: new Date().toISOString(),
        metadata: {
          platform: 'google_ads',
          form_id: payload.form_id,
          campaign_id: payload.campaign_id,
          gcl_id: payload.gcl_id,
          raw_fields: leadFields,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Google lead insert error:', insertError);
      return jsonResponse({ error: insertError.message }, 500);
    }

    console.log(`Google Ads lead ingested: ${insertedLead?.id}, status: ${initialStatus}`);
    
    // Try matching to firms
    if (insertedLead?.id) {
      try {
        const { data: matches } = await supabase.rpc('match_lead_to_firms', { _lead_id: insertedLead.id });
        if (matches && matches.length > 0) {
          console.log(`Lead matched to ${matches.length} firms`);
        }
      } catch (matchErr) {
        console.error('Lead matching error (non-fatal):', matchErr);
      }
    }

    return jsonResponse({ success: true, lead_id: insertedLead?.id, status: initialStatus });
  } catch (error) {
    console.error('Google webhook error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
