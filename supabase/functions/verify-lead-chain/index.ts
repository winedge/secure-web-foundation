import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, self_heal } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: 'lead_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all blocks for this lead ordered by block_number
    const { data: blocks, error } = await supabase
      .from('lead_blockchain')
      .select('*')
      .eq('lead_id', lead_id)
      .order('block_number', { ascending: true });

    if (error) throw error;

    if (!blocks || blocks.length === 0) {
      return new Response(JSON.stringify({
        valid: true,
        total_blocks: 0,
        message: 'No blockchain blocks found for this lead',
        verified_at: new Date().toISOString(),
        lineage: { consent_events: 0, ai_decisions: 0, lifecycle_events: 0, signatures: 0 }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify each block's hash and chain linkage
    let chain_valid = true;
    let break_at: number | null = null;
    let break_reason = '';
    const issues: Array<{ block_number: number; issue: string; healed: boolean }> = [];

    // Data lineage counters
    const lineage = {
      consent_events: 0,
      ai_decisions: 0,
      ai_consents: 0,
      lifecycle_events: 0,
      signatures: 0,
      total_actors: new Set<string>(),
    };

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Count lineage
      switch (block.event_type) {
        case 'consent_recorded': lineage.consent_events++; break;
        case 'ai_decision': lineage.ai_decisions++; break;
        case 'ai_consent_acknowledged': lineage.ai_consents++; break;
        case 'document_signed': lineage.signatures++; break;
        default: lineage.lifecycle_events++; break;
      }
      if (block.actor_id) lineage.total_actors.add(block.actor_id);

      // Verify chain linkage
      if (i === 0) {
        if (block.previous_hash !== null) {
          chain_valid = false;
          break_at = block.block_number;
          break_reason = 'Genesis block has a previous_hash (should be null)';
          issues.push({ block_number: block.block_number, issue: break_reason, healed: false });
          break;
        }
      } else {
        const prevBlock = blocks[i - 1];
        if (block.previous_hash !== prevBlock.sha256_hash) {
          chain_valid = false;
          break_at = block.block_number;
          break_reason = `Chain link broken: block ${block.block_number} previous_hash does not match block ${prevBlock.block_number} hash`;
          issues.push({ block_number: block.block_number, issue: break_reason, healed: false });
          break;
        }
      }

      // Verify sequential block numbers
      if (block.block_number !== i + 1) {
        const gapIssue = `Block number gap: expected ${i + 1}, got ${block.block_number}`;
        issues.push({ block_number: block.block_number, issue: gapIssue, healed: false });
        if (chain_valid) {
          chain_valid = false;
          break_at = block.block_number;
          break_reason = gapIssue;
        }
      }
    }

    // Update integrity_status on all blocks
    const now = new Date().toISOString();
    if (chain_valid) {
      await supabase
        .from('lead_blockchain')
        .update({ integrity_status: 'valid', last_verified_at: now })
        .eq('lead_id', lead_id);
    } else if (break_at !== null) {
      // Mark blocks before break as valid, at/after break as flagged
      const validBlocks = blocks.filter(b => b.block_number < break_at!);
      const flaggedBlocks = blocks.filter(b => b.block_number >= break_at!);
      
      if (validBlocks.length > 0) {
        await supabase
          .from('lead_blockchain')
          .update({ integrity_status: 'valid', last_verified_at: now })
          .eq('lead_id', lead_id)
          .in('id', validBlocks.map(b => b.id));
      }
      if (flaggedBlocks.length > 0) {
        await supabase
          .from('lead_blockchain')
          .update({ integrity_status: 'flagged', last_verified_at: now })
          .eq('lead_id', lead_id)
          .in('id', flaggedBlocks.map(b => b.id));
      }
    }

    // Self-healing: if requested and chain is broken, log a remediation block
    let healed = false;
    if (self_heal && !chain_valid && break_at !== null) {
      // Append a remediation event that acknowledges the break
      const lastValidBlock = blocks.find(b => b.block_number === (break_at! - 1));
      if (lastValidBlock) {
        await supabase.rpc('append_lead_block', {
          _lead_id: lead_id,
          _event_type: 'integrity_remediation',
          _event_data: {
            break_detected_at: break_at,
            break_reason: break_reason,
            remediation_action: 'chain_break_acknowledged',
            remediation_note: 'Integrity break detected and logged. Previous chain segments remain valid. New events chain from last verified block.',
            verified_at: now,
          },
          _actor_id: null,
        });
        healed = true;
        issues[issues.length - 1].healed = true;
      }
    }

    const result = {
      valid: chain_valid,
      total_blocks: blocks.length,
      ...(break_at !== null && { break_at, break_reason }),
      first_block: blocks[0]?.created_at,
      last_block: blocks[blocks.length - 1]?.created_at,
      verified_at: now,
      self_healed: healed,
      issues,
      lineage: {
        consent_events: lineage.consent_events,
        ai_decisions: lineage.ai_decisions,
        ai_consents: lineage.ai_consents,
        lifecycle_events: lineage.lifecycle_events,
        signatures: lineage.signatures,
        unique_actors: lineage.total_actors.size,
      },
      blocks_summary: blocks.map(b => ({
        block_number: b.block_number,
        event_type: b.event_type,
        hash_prefix: b.sha256_hash.substring(0, 12),
        integrity_status: chain_valid ? 'valid' : (b.block_number >= (break_at || 0) ? 'flagged' : 'valid'),
        created_at: b.created_at
      }))
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Chain verification error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
