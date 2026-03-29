

# Blockchain Audit Trail Implementation

## What It Does
Every lead lifecycle event (creation, AI scoring, verification, purchase, stage change) gets a cryptographic SHA-256 hash chained to the previous event, creating a tamper-proof, court-admissible record proving lead authenticity. No existing `lead_blockchain` table or components exist yet; this is built from scratch.

## Implementation Steps

### 1. Database Migration
- Create `lead_blockchain` table with columns: `id`, `lead_id`, `block_number`, `event_type`, `event_data` (jsonb), `actor_id`, `sha256_hash`, `previous_hash`, `nonce` (random salt for added security), `created_at`
- Unique constraint on `(lead_id, block_number)`
- Enable `pgcrypto` extension (if not already)
- Create `append_lead_block()` SECURITY DEFINER function:
  - Fetches previous block's hash
  - Computes `SHA-256(block_number || event_type || event_data::text || previous_hash || nonce || timestamp)`
  - Inserts new block with chained hash
- Create triggers:
  - On `leads` INSERT: auto-record `lead_created` block
  - On `leads` UPDATE (status/score changes): auto-record `lead_updated` block
  - On `lead_purchases` INSERT: auto-record `lead_purchased` block
  - On `lead_purchases` UPDATE (pipeline_stage): auto-record `stage_change` block
- RLS: firm members can read blocks for their purchased leads; admins can read all

### 2. Chain Verification Edge Function
New `supabase/functions/verify-lead-chain/index.ts`:
- Accepts `lead_id`, fetches all blocks ordered by `block_number`
- Recomputes each hash using the same algorithm, verifies it matches the stored hash and chains correctly to `previous_hash`
- Returns `{ valid: boolean, total_blocks: number, break_at?: number, verified_at: timestamp }`

### 3. BlockchainAuditTrail UI Component
New `src/components/leads/BlockchainAuditTrail.tsx`:
- Fetches blocks from `lead_blockchain` for the given lead
- Displays as a vertical timeline with block numbers, event types, truncated hashes, and timestamps
- "Verify Chain Integrity" button calls the edge function, shows green checkmark or red alert
- Each block shows a chain-link icon connecting to the next
- Export button for court-ready summary (JSON + formatted text)

### 4. Integration into Lead Detail Modal
- Add a third tab "Blockchain" in `LeadDetailModal.tsx` (alongside Details and E-Sign)
- Shows `BlockchainAuditTrail` component for purchased leads
- Locked state for unpurchased leads

### 5. Lead Card Badge
- Add a small chain/link icon badge on `LeadCard.tsx` indicating the lead has blockchain-backed authenticity
- Tooltip: "Blockchain-verified audit trail"

## Files Changed
- **New migration**: `lead_blockchain` table, `append_lead_block()` function, triggers, RLS policies
- **New**: `supabase/functions/verify-lead-chain/index.ts`
- **New**: `src/components/leads/BlockchainAuditTrail.tsx`
- **Edit**: `src/components/leads/LeadDetailModal.tsx` (add Blockchain tab)
- **Edit**: `src/components/leads/LeadCard.tsx` (add chain badge)
- **Edit**: `supabase/config.toml` (add verify-lead-chain function config)

