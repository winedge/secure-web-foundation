import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

/**
 * Meta Lead Form Webhook
 * Receives leads from Meta (Facebook/Instagram) Lead Ads in real-time.
 * 
 * Meta sends a POST with:
 * { entry: [{ changes: [{ value: { leadgen_id, form_id, ... } }] }] }
 * 
 * We fetch lead data from Meta Graph API and ingest it.
 */

interface MetaLeadFormData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  // Custom questions mapped by field name
  [key: string]: string | undefined;
}

function calculateQualityScore(lead: MetaLeadFormData): number {
  let score = 50;
  if (lead.email) score += 10;
  if (lead.phone_number) score += 10;
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

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  // Meta webhook verification (GET request with hub.challenge)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'leadthru_meta_webhook';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Meta webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const supabase = createSupabaseClient(true);
    const payload = await req.json();
    
    console.log('Meta webhook received:', JSON.stringify(payload).slice(0, 500));

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

    const results = { total: 0, inserted: 0, duplicates: 0, errors: 0 };

    if (payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id;
            const formId = change.value?.form_id;
            
            // Try to fetch lead data from Meta Graph API
            let leadData: MetaLeadFormData = {};
            
            // Get Meta access token from admin settings
            const { data: metaTokenSetting } = await supabase
              .from('admin_settings')
              .select('value')
              .eq('key', 'meta_page_access_token')
              .maybeSingle();
            
            const accessToken = metaTokenSetting?.value?.token;
            
            if (accessToken && leadgenId) {
              try {
                const metaResp = await fetch(
                  `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`
                );
                const metaData = await metaResp.json();
                
                if (metaData.field_data) {
                  for (const field of metaData.field_data) {
                    leadData[field.name] = field.values?.[0] || '';
                  }
                }
              } catch (metaErr) {
                console.error('Failed to fetch Meta lead data:', metaErr);
              }
            }
            
            results.total++;
            
            // Check for duplicates
            if (leadData.email || leadData.phone_number) {
              let dupeQuery = supabase.from('leads').select('id');
              if (leadData.email) dupeQuery = dupeQuery.eq('email', leadData.email);
              else if (leadData.phone_number) dupeQuery = dupeQuery.eq('phone', leadData.phone_number);
              
              const { data: existingLead } = await dupeQuery.limit(1).maybeSingle();
              if (existingLead) {
                results.duplicates++;
                continue;
              }
            }
            
            // Determine tort type from form or default
            const tortType = leadData['tort_type'] || leadData['case_type'] || 'General';
            const state = leadData.state || leadData['state/province'] || 'Unknown';
            
            const qualityScore = calculateQualityScore(leadData);
            const tier = calculateTier(qualityScore);
            const price = calculatePrice(tier, tortType);
            
            const { error: insertError } = await supabase
              .from('leads')
              .insert({
                first_name: leadData.first_name || null,
                last_name: leadData.last_name || null,
                email: leadData.email || null,
                phone: leadData.phone_number || null,
                city: leadData.city || null,
                state,
                zip_code: leadData.zip_code || null,
                tort_type: tortType,
                ai_quality_score: qualityScore,
                tier,
                price,
                status: initialStatus,
                source: 'meta_ads',
                source_id: sourceMap.get('meta_ads') || null,
                external_id: leadgenId,
                is_verified: false,
                is_exclusive: true,
                ingested_at: new Date().toISOString(),
                metadata: {
                  platform: 'meta',
                  form_id: formId,
                  leadgen_id: leadgenId,
                  raw_data: leadData,
                },
              });
            
            if (insertError) {
              console.error('Insert error:', insertError);
              results.errors++;
            } else {
              results.inserted++;
            }
          }
        }
      }
    }

    console.log(`Meta webhook processed: ${results.inserted} inserted, ${results.duplicates} dupes, ${results.errors} errors`);
    return jsonResponse({ success: true, ...results });
  } catch (error) {
    console.error('Meta webhook error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
