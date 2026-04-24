/**
 * End-to-end boundary test for lead filter submission.
 *
 * Exercises `validateLeadFilters` AND the `useLeads` query builder with the
 * exact boundary values requested:
 *   - tier: A, B, C, D (and an invalid value)
 *   - minScore: 0, 100 (and 101 / -1 / NaN)
 *   - maxPrice: 0, 1_000_000 (and 1_000_001 / negative)
 *
 * The "backend" is the chained Supabase query builder — we mock it so we can
 * capture every `.eq()`, `.gte()`, `.lte()` call and assert that the filter
 * actually reaches the query (or is correctly stripped).
 *
 * This is a true round-trip in the sense that:
 *   1. The filter object enters the hook,
 *   2. It passes through the same Zod schema the production code uses,
 *   3. The query builder applies it via the same switch statement,
 *   4. We observe the resulting `eq/gte/lte` calls — the "applied" backend filters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// --- Mock the Supabase client BEFORE importing the hook ----------------------
// We capture every chain method call so the test can introspect what was sent
// to the backend.
type CallLog = { method: string; args: unknown[] };
const callLog: CallLog[] = [];

const makeChain = () => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const passthrough =
    (name: string) =>
    (...args: unknown[]) => {
      callLog.push({ method: name, args });
      return chain;
    };
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'in', 'maybeSingle']) {
    chain[m] = passthrough(m);
  }
  // Terminal: awaiting the chain resolves with `{ data, error }`. We attach
  // a `.then` so `await query` works (the production code awaits the chain
  // directly). The `any` cast is intentional — this is a test thenable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (chain as any).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve);
  return chain;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((_table: string) => {
      callLog.push({ method: 'from', args: [_table] });
      return makeChain();
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  },
}));

// Auth + firm hooks are unrelated to filter application; stub them.
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, loading: false }),
}));
vi.mock('./use-firm', () => ({
  useFirm: () => ({ data: { id: 'test-firm' } }),
}));

// Silence toast side-effects.
vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// --- Now import the unit under test -----------------------------------------
import { useLeads, validateLeadFilters, LeadFilters } from './use-leads';

// --- Test helpers ------------------------------------------------------------
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

/**
 * Drive the hook with a filter set and return the chain calls made on the
 * 'leads' table — i.e. exactly what filters were applied to the backend query.
 */
async function runWithFilters(filters: LeadFilters): Promise<CallLog[]> {
  callLog.length = 0;
  const { result } = renderHook(
    () =>
      useLeads(filters, {
        // Boundaries-only test: skip whitelist checks + side effects.
        notifyOnReject: false,
        logRejections: false,
      }),
    { wrapper }
  );
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  // Return calls scoped to the leads-table query (skip noise from other tables).
  const fromIdx = callLog.findIndex((c) => c.method === 'from' && c.args[0] === 'leads');
  return fromIdx >= 0 ? callLog.slice(fromIdx) : [];
}

const findCall = (log: CallLog[], method: string, column: string) =>
  log.find((c) => c.method === method && c.args[0] === column);

// ============================================================================
// 1. Validator-level boundary behavior
// ============================================================================
describe('validateLeadFilters — tier + minScore/maxPrice boundaries', () => {
  it('accepts every valid tier letter', () => {
    for (const tier of ['A', 'B', 'C', 'D']) {
      const { safe, rejections } = validateLeadFilters({ tier });
      expect(safe.tier).toBe(tier);
      expect(rejections.find((r) => r.field === 'tier')).toBeUndefined();
    }
  });

  it('rejects an invalid tier letter', () => {
    const { safe, rejections } = validateLeadFilters({ tier: 'Z' });
    expect(safe.tier).toBeUndefined();
    expect(rejections.find((r) => r.field === 'tier')).toBeDefined();
  });

  it('accepts minScore at the lower bound (0)', () => {
    const { safe, rejections } = validateLeadFilters({ minScore: 0 });
    expect(safe.minScore).toBe(0);
    expect(rejections.find((r) => r.field === 'minScore')).toBeUndefined();
  });

  it('accepts minScore at the upper bound (100)', () => {
    const { safe, rejections } = validateLeadFilters({ minScore: 100 });
    expect(safe.minScore).toBe(100);
    expect(rejections.find((r) => r.field === 'minScore')).toBeUndefined();
  });

  it('rejects minScore just over the upper bound (101)', () => {
    const { safe, rejections } = validateLeadFilters({ minScore: 101 });
    expect(safe.minScore).toBeUndefined();
    expect(rejections.find((r) => r.field === 'minScore')).toBeDefined();
  });

  it('rejects negative minScore', () => {
    const { safe, rejections } = validateLeadFilters({ minScore: -1 });
    expect(safe.minScore).toBeUndefined();
    expect(rejections.find((r) => r.field === 'minScore')).toBeDefined();
  });

  it('rejects NaN minScore', () => {
    const { safe, rejections } = validateLeadFilters({ minScore: NaN });
    expect(safe.minScore).toBeUndefined();
    expect(rejections.find((r) => r.field === 'minScore')).toBeDefined();
  });

  it('accepts maxPrice at the lower bound (0)', () => {
    const { safe, rejections } = validateLeadFilters({ maxPrice: 0 });
    expect(safe.maxPrice).toBe(0);
    expect(rejections.find((r) => r.field === 'maxPrice')).toBeUndefined();
  });

  it('accepts maxPrice at the upper bound (1,000,000)', () => {
    const { safe, rejections } = validateLeadFilters({ maxPrice: 1_000_000 });
    expect(safe.maxPrice).toBe(1_000_000);
    expect(rejections.find((r) => r.field === 'maxPrice')).toBeUndefined();
  });

  it('rejects maxPrice just over the upper bound (1,000,001)', () => {
    const { safe, rejections } = validateLeadFilters({ maxPrice: 1_000_001 });
    expect(safe.maxPrice).toBeUndefined();
    expect(rejections.find((r) => r.field === 'maxPrice')).toBeDefined();
  });

  it('rejects negative maxPrice', () => {
    const { safe, rejections } = validateLeadFilters({ maxPrice: -0.01 });
    expect(safe.maxPrice).toBeUndefined();
    expect(rejections.find((r) => r.field === 'maxPrice')).toBeDefined();
  });
});

// ============================================================================
// 2. Query-builder application — does the validated value REACH the backend?
// ============================================================================
describe('useLeads — backend applies tier + minScore/maxPrice boundaries', () => {
  beforeEach(() => callLog.splice(0));

  it('applies tier=A via .eq("tier", "A")', async () => {
    const log = await runWithFilters({ tier: 'A' });
    expect(findCall(log, 'eq', 'tier')).toMatchObject({ args: ['tier', 'A'] });
  });

  it('applies tier=D via .eq("tier", "D")', async () => {
    const log = await runWithFilters({ tier: 'D' });
    expect(findCall(log, 'eq', 'tier')).toMatchObject({ args: ['tier', 'D'] });
  });

  it('does NOT push tier=Z (invalid) to backend', async () => {
    const log = await runWithFilters({ tier: 'Z' as 'A' });
    expect(findCall(log, 'eq', 'tier')).toBeUndefined();
  });

  it('applies maxPrice=0 via .lte("price", 0)', async () => {
    // Boundary: 0 is valid AND non-empty, so it should reach the backend.
    const log = await runWithFilters({ maxPrice: 0 });
    expect(findCall(log, 'lte', 'price')).toMatchObject({ args: ['price', 0] });
  });

  it('applies maxPrice=1,000,000 via .lte("price", 1_000_000)', async () => {
    const log = await runWithFilters({ maxPrice: 1_000_000 });
    expect(findCall(log, 'lte', 'price')).toMatchObject({ args: ['price', 1_000_000] });
  });

  it('does NOT push maxPrice=1,000,001 (over-bound) to backend', async () => {
    const log = await runWithFilters({ maxPrice: 1_000_001 });
    expect(findCall(log, 'lte', 'price')).toBeUndefined();
  });

  it('applies minScore=100 via .gte("ai_quality_score", 100)', async () => {
    const log = await runWithFilters({ minScore: 100 });
    expect(findCall(log, 'gte', 'ai_quality_score')).toMatchObject({
      args: ['ai_quality_score', 100],
    });
  });

  it('treats minScore=0 as a no-op (documented: only > 0 is forwarded)', async () => {
    // The hook's switch explicitly guards `value > 0` for minScore — sending 0
    // is equivalent to "no minimum", so no .gte() call should be made.
    const log = await runWithFilters({ minScore: 0 });
    expect(findCall(log, 'gte', 'ai_quality_score')).toBeUndefined();
  });

  it('does NOT push minScore=101 (over-bound) to backend', async () => {
    const log = await runWithFilters({ minScore: 101 });
    expect(findCall(log, 'gte', 'ai_quality_score')).toBeUndefined();
  });

  it('applies all three boundary filters together (tier=A, minScore=100, maxPrice=1,000,000)', async () => {
    const log = await runWithFilters({ tier: 'A', minScore: 100, maxPrice: 1_000_000 });
    expect(findCall(log, 'eq', 'tier')).toMatchObject({ args: ['tier', 'A'] });
    expect(findCall(log, 'gte', 'ai_quality_score')).toMatchObject({
      args: ['ai_quality_score', 100],
    });
    expect(findCall(log, 'lte', 'price')).toMatchObject({ args: ['price', 1_000_000] });
  });

  it('applies status=available scope on every query (sanity)', async () => {
    const log = await runWithFilters({ tier: 'B' });
    expect(findCall(log, 'eq', 'status')).toMatchObject({ args: ['status', 'available'] });
  });
});
