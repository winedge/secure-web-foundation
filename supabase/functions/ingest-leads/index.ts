import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

interface LeadData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state: string;
  zip_code?: string;
  tort_type: string;
  age_bucket?: string;
  diagnosis_details?: string;
  exposure_details?: string;
  source_type: 'csv_upload' | 'google_ads' | 'meta_ads' | 'dialer' | 'crm' | 'intake_form' | 'referral' | 'other';
  external_id?: string;
  metadata?: Record<string, unknown>;
}

interface IngestRequest {
  leads: LeadData[];
  deduplicate?: boolean;
}

async function checkDuplicate(supabase: any, email?: string, phone?: string): Promise<{ isDuplicate: boolean; duplicateOf?: string }> {
  if (!email && !phone) return { isDuplicate: false };

  let query = supabase.from('leads').select('id');
  if (email) query = query.eq('email', email);
  else if (phone) query = query.eq('phone', phone);

  const { data } = await query.limit(1).single();
  if (data?.id) return { isDuplicate: true, duplicateOf: data.id };
  return { isDuplicate: false };
}

function calculateQualityScore(lead: LeadData): number {
  let score = 50;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.first_name && lead.last_name) score += 5;
  if (lead.address) score += 5;
  if (lead.city) score += 3;
  if (lead.zip_code) score += 2;
  if (lead.diagnosis_details) score += 10;
  if (lead.exposure_details) score += 5;
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

  try {
    const supabase = createSupabaseClient(true);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: 'Invalid authorization token' }, 401);

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
    if (!roles) return jsonResponse({ error: 'Admin access required' }, 403);

    const body: IngestRequest = await req.json();
    const { leads, deduplicate = true } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return jsonResponse({ error: 'No leads provided' }, 400);
    }

    console.log(`Processing ${leads.length} leads...`);

    // Check if lead verification is required
    const { data: verificationSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'lead_verification_required')
      .maybeSingle();
    
    const requiresVerification = verificationSetting?.value?.enabled === true;
    const initialStatus = requiresVerification ? 'pending_review' : 'available';

    const { data: sources } = await supabase.from('lead_sources').select('id, source_type');
    const sourceMap = new Map((sources as Array<{ id: string; source_type: string }> || []).map(s => [s.source_type, s.id]));

    const results = { total: leads.length, inserted: 0, duplicates: 0, errors: 0, insertedIds: [] as string[], duplicateIds: [] as string[] };

    for (const lead of leads) {
      try {
        if (deduplicate) {
          const { isDuplicate, duplicateOf } = await checkDuplicate(supabase, lead.email, lead.phone);
          if (isDuplicate) {
            results.duplicates++;
            if (duplicateOf) results.duplicateIds.push(duplicateOf);
            continue;
          }
        }

        const qualityScore = calculateQualityScore(lead);
        const tier = calculateTier(qualityScore);
        const price = calculatePrice(tier, lead.tort_type);

        const { data: insertedLead, error: insertError } = await supabase
          .from('leads')
          .insert({
            first_name: lead.first_name, last_name: lead.last_name,
            email: lead.email, phone: lead.phone, address: lead.address,
            city: lead.city, state: lead.state, zip_code: lead.zip_code,
            tort_type: lead.tort_type, age_bucket: lead.age_bucket,
            diagnosis_details: lead.diagnosis_details, exposure_details: lead.exposure_details,
            ai_quality_score: qualityScore, tier, price, status: initialStatus,
            source_id: sourceMap.get(lead.source_type), external_id: lead.external_id,
            ingested_at: new Date().toISOString(), metadata: lead.metadata || {},
            is_verified: false, is_exclusive: true,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          results.errors++;
        } else if (insertedLead?.id) {
          results.inserted++;
          results.insertedIds.push(insertedLead.id);

          try {
            const { data: matches } = await supabase.rpc('match_lead_to_firms', { _lead_id: insertedLead.id });
            if (matches && Array.isArray(matches) && matches.length > 0) {
              console.log(`Lead ${insertedLead.id} matched to ${matches.length} firms`);
              for (const match of matches.slice(0, 5)) {
                await supabase.from('audit_logs').insert({
                  user_id: user.id, action: 'lead_matched', entity_type: 'lead',
                  entity_id: insertedLead.id,
                  details: { firm_id: match.firm_id, firm_name: match.firm_name, match_score: match.match_score },
                });
              }

              // Trigger email notifications to matched firms
              try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
                await fetch(`${supabaseUrl}/functions/v1/lead-notification`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({ lead_id: insertedLead.id, matches: matches.slice(0, 5) }),
                });
              } catch (notifErr) {
                console.error('Notification error (non-fatal):', notifErr);
              }
            }
          } catch (matchErr) {
            console.error('Lead matching error (non-fatal):', matchErr);
          }
        }
      } catch (err) {
        console.error('Lead processing error:', err);
        results.errors++;
      }
    }

    console.log(`Ingestion complete: ${results.inserted} inserted, ${results.duplicates} duplicates, ${results.errors} errors`);
    return jsonResponse(results);
  } catch (error) {
    console.error('Ingest error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
