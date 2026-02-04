import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

// Simple deduplication check by email or phone
// deno-lint-ignore no-explicit-any
async function checkDuplicate(
  supabase: any,
  email?: string,
  phone?: string
): Promise<{ isDuplicate: boolean; duplicateOf?: string }> {
  if (!email && !phone) {
    return { isDuplicate: false };
  }

  let query = supabase.from('leads').select('id');
  
  if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    query = query.eq('phone', phone);
  }

  const { data } = await query.limit(1).single();
  
  if (data && typeof data === 'object' && 'id' in data) {
    return { isDuplicate: true, duplicateOf: (data as { id: string }).id };
  }
  
  return { isDuplicate: false };
}

// Calculate AI quality score based on data completeness and quality
function calculateQualityScore(lead: LeadData): number {
  let score = 50; // Base score
  
  // Contact info completeness
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.first_name && lead.last_name) score += 5;
  if (lead.address) score += 5;
  if (lead.city) score += 3;
  if (lead.zip_code) score += 2;
  
  // Case details
  if (lead.diagnosis_details) score += 10;
  if (lead.exposure_details) score += 5;
  
  return Math.min(100, score);
}

// Calculate tier based on quality score
function calculateTier(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// Calculate price based on tier and tort type
function calculatePrice(tier: 'A' | 'B' | 'C' | 'D', tortType: string): number {
  const basePrices: Record<string, number> = {
    'Camp Lejeune': 500,
    'Roundup': 400,
    'Talcum Powder': 450,
    'AFFF': 550,
    'Paraquat': 500,
    '3M Earplugs': 350,
  };
  
  const tierMultipliers: Record<string, number> = {
    'A': 1.5,
    'B': 1.0,
    'C': 0.7,
    'D': 0.4,
  };
  
  const basePrice = basePrices[tortType] || 400;
  return Math.round(basePrice * tierMultipliers[tier]);
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

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: IngestRequest = await req.json();
    const { leads, deduplicate = true } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${leads.length} leads...`);

    // Get source IDs
    const { data: sources } = await supabase
      .from('lead_sources')
      .select('id, source_type');
    
    const sourceMap = new Map((sources as Array<{ id: string; source_type: string }> || []).map(s => [s.source_type, s.id]));

    const results = {
      total: leads.length,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      insertedIds: [] as string[],
      duplicateIds: [] as string[],
    };

    for (const lead of leads) {
      try {
        // Check for duplicates if enabled
        if (deduplicate) {
          const { isDuplicate, duplicateOf } = await checkDuplicate(
            supabase,
            lead.email,
            lead.phone
          );
          
          if (isDuplicate) {
            results.duplicates++;
            if (duplicateOf) results.duplicateIds.push(duplicateOf);
            continue;
          }
        }

        // Calculate scores and pricing
        const qualityScore = calculateQualityScore(lead);
        const tier = calculateTier(qualityScore);
        const price = calculatePrice(tier, lead.tort_type);

        // Insert lead
        const { data: insertedLead, error: insertError } = await supabase
          .from('leads')
          .insert({
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip_code: lead.zip_code,
            tort_type: lead.tort_type,
            age_bucket: lead.age_bucket,
            diagnosis_details: lead.diagnosis_details,
            exposure_details: lead.exposure_details,
            ai_quality_score: qualityScore,
            tier,
            price,
            status: 'available',
            source_id: sourceMap.get(lead.source_type),
            external_id: lead.external_id,
            ingested_at: new Date().toISOString(),
            metadata: lead.metadata || {},
            is_verified: false,
            is_exclusive: true,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          results.errors++;
        } else if (insertedLead && typeof insertedLead === 'object' && 'id' in insertedLead) {
          results.inserted++;
          results.insertedIds.push((insertedLead as { id: string }).id);
        }
      } catch (err) {
        console.error('Lead processing error:', err);
        results.errors++;
      }
    }

    console.log(`Ingestion complete: ${results.inserted} inserted, ${results.duplicates} duplicates, ${results.errors} errors`);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
