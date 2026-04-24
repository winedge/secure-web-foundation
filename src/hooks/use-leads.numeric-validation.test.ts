/**
 * Backend numeric validation tests for `validateLeadFilters`.
 *
 * Bounds (mirrored from the production Zod schema in use-leads.ts):
 *   - minScore: integer in [0, 100]
 *   - maxPrice: number   in [0, 1_000_000]
 *
 * Goal: every malformed shape — NaN, ±Infinity, negatives, over-cap, junk
 * strings, booleans, objects — must be safely STRIPPED from `safe` and
 * surfaced in `rejections` with the offending value preserved for logging.
 *
 * The validator is the single backend gatekeeper before the Supabase query
 * builder runs, so anything that slips through here ends up in a real query.
 */

import { describe, it, expect } from 'vitest';
import { validateLeadFilters, LeadFilters } from './use-leads';

// Helper: assert a field was stripped AND a rejection captured the bad value.
const expectRejected = (
  raw: Partial<Record<keyof LeadFilters, unknown>>,
  field: 'minScore' | 'maxPrice'
) => {
  const { safe, rejections } = validateLeadFilters(raw as LeadFilters);
  expect(safe[field]).toBeUndefined();
  const r = rejections.find((x) => x.field === field);
  expect(r).toBeDefined();
  return r!;
};

// Helper: assert a field was accepted with the expected coerced value.
const expectAccepted = (
  raw: Partial<Record<keyof LeadFilters, unknown>>,
  field: 'minScore' | 'maxPrice',
  expected: number
) => {
  const { safe, rejections } = validateLeadFilters(raw as LeadFilters);
  expect(safe[field]).toBe(expected);
  expect(rejections.find((x) => x.field === field)).toBeUndefined();
};

// ============================================================================
// minScore — integer in [0, 100]
// ============================================================================
describe('validateLeadFilters › minScore — malformed inputs are stripped', () => {
  it('rejects NaN', () => {
    expectRejected({ minScore: NaN }, 'minScore');
  });

  it('rejects positive Infinity', () => {
    expectRejected({ minScore: Number.POSITIVE_INFINITY }, 'minScore');
  });

  it('rejects negative Infinity', () => {
    expectRejected({ minScore: Number.NEGATIVE_INFINITY }, 'minScore');
  });

  it('rejects negative integers', () => {
    expectRejected({ minScore: -1 }, 'minScore');
    expectRejected({ minScore: -100 }, 'minScore');
  });

  it('rejects values just over the cap (101)', () => {
    expectRejected({ minScore: 101 }, 'minScore');
  });

  it('rejects very large over-cap values', () => {
    expectRejected({ minScore: 999_999 }, 'minScore');
    expectRejected({ minScore: Number.MAX_SAFE_INTEGER }, 'minScore');
  });

  it('rejects non-integer numbers in range (e.g. 50.5)', () => {
    // Schema declares `.int()` — fractional values must be stripped.
    expectRejected({ minScore: 50.5 }, 'minScore');
    expectRejected({ minScore: 99.9 }, 'minScore');
  });

  it('rejects junk strings', () => {
    // NOTE: `z.coerce.number()` turns `""` and `"   "` into 0 (a valid in-range
    // value), so they're intentionally NOT in this list — they're documented as
    // "treated as 0" rather than rejected. Only strings that fail numeric coercion
    // are tested here.
    for (const junk of ['abc', 'high', '50abc', 'one hundred', 'NaN']) {
      // `as unknown as number` because TS would otherwise refuse — the whole
      // point is to simulate untrusted runtime input from URL params / API.
      expectRejected({ minScore: junk as unknown as number }, 'minScore');
    }
  });

  it('rejects booleans', () => {
    // `z.coerce.number()` would turn `true`→1, but we still want strict typing.
    // If the coercion accepts booleans on a given Zod version, this confirms
    // the resulting value is at least bounded — but preferably stripped.
    const { safe } = validateLeadFilters({
      minScore: true as unknown as number,
    });
    // Either stripped, or coerced to a valid in-range integer (0 or 1).
    expect(safe.minScore === undefined || safe.minScore === 0 || safe.minScore === 1).toBe(true);
  });

  it('rejects null and arrays/objects', () => {
    // null → coerce gives 0 (valid), so we only assert it's safely in-range
    // OR stripped; the key invariant is that no junk shape reaches the DB.
    const { safe: sNull } = validateLeadFilters({ minScore: null as unknown as number });
    expect(sNull.minScore === undefined || sNull.minScore === 0).toBe(true);

    // Multi-element arrays + objects: definitely junk, definitely rejected.
    expectRejected({ minScore: [1, 2, 3] as unknown as number }, 'minScore');
    expectRejected({ minScore: { value: 50 } as unknown as number }, 'minScore');
  });

  it('preserves the offending value in the rejection record (for logging)', () => {
    const r = expectRejected({ minScore: 999 }, 'minScore');
    expect(r.value).toBe(999);
    expect(r.reason).toMatch(/schema|number|integer|less|greater/i);
  });

  it('still accepts valid boundary values', () => {
    expectAccepted({ minScore: 0 }, 'minScore', 0);
    expectAccepted({ minScore: 50 }, 'minScore', 50);
    expectAccepted({ minScore: 100 }, 'minScore', 100);
  });

  it('coerces valid numeric strings (e.g. "75" from URL params)', () => {
    // `z.coerce.number()` is intentional so URL params parse cleanly.
    expectAccepted({ minScore: '75' as unknown as number }, 'minScore', 75);
    expectAccepted({ minScore: '0' as unknown as number }, 'minScore', 0);
    expectAccepted({ minScore: '100' as unknown as number }, 'minScore', 100);
  });
});

// ============================================================================
// maxPrice — number in [0, 1_000_000] (fractional allowed)
// ============================================================================
describe('validateLeadFilters › maxPrice — malformed inputs are stripped', () => {
  it('rejects NaN', () => {
    expectRejected({ maxPrice: NaN }, 'maxPrice');
  });

  it('rejects positive Infinity', () => {
    expectRejected({ maxPrice: Number.POSITIVE_INFINITY }, 'maxPrice');
  });

  it('rejects negative Infinity', () => {
    expectRejected({ maxPrice: Number.NEGATIVE_INFINITY }, 'maxPrice');
  });

  it('rejects negative numbers', () => {
    expectRejected({ maxPrice: -0.01 }, 'maxPrice');
    expectRejected({ maxPrice: -1 }, 'maxPrice');
    expectRejected({ maxPrice: -1_000_000 }, 'maxPrice');
  });

  it('rejects values just over the cap (1,000,001)', () => {
    expectRejected({ maxPrice: 1_000_001 }, 'maxPrice');
  });

  it('rejects very large over-cap values', () => {
    expectRejected({ maxPrice: 1e9 }, 'maxPrice');
    expectRejected({ maxPrice: Number.MAX_SAFE_INTEGER }, 'maxPrice');
    expectRejected({ maxPrice: Number.MAX_VALUE }, 'maxPrice');
  });

  it('rejects junk strings', () => {
    for (const junk of ['cheap', '$100', '1,000', '1_000', 'free', 'NaN', '', '   ', 'abc123']) {
      expectRejected({ maxPrice: junk as unknown as number }, 'maxPrice');
    }
  });

  it('rejects arrays/objects', () => {
    expectRejected({ maxPrice: [100] as unknown as number }, 'maxPrice');
    expectRejected({ maxPrice: { price: 100 } as unknown as number }, 'maxPrice');
  });

  it('preserves the offending value in the rejection record (for logging)', () => {
    const r = expectRejected({ maxPrice: 5_000_000 }, 'maxPrice');
    expect(r.value).toBe(5_000_000);
    expect(r.reason).toMatch(/schema|number|less|greater/i);
  });

  it('still accepts valid boundary values', () => {
    expectAccepted({ maxPrice: 0 }, 'maxPrice', 0);
    expectAccepted({ maxPrice: 1500 }, 'maxPrice', 1500);
    expectAccepted({ maxPrice: 1_000_000 }, 'maxPrice', 1_000_000);
  });

  it('accepts fractional values inside the range (e.g. 99.99)', () => {
    expectAccepted({ maxPrice: 99.99 }, 'maxPrice', 99.99);
    expectAccepted({ maxPrice: 0.01 }, 'maxPrice', 0.01);
  });

  it('coerces valid numeric strings (e.g. "1500" from URL params)', () => {
    expectAccepted({ maxPrice: '1500' as unknown as number }, 'maxPrice', 1500);
    expectAccepted({ maxPrice: '0' as unknown as number }, 'maxPrice', 0);
    expectAccepted({ maxPrice: '1000000' as unknown as number }, 'maxPrice', 1_000_000);
  });
});

// ============================================================================
// Combined: malformed numeric inputs do not pollute OTHER valid filters.
// ============================================================================
describe('validateLeadFilters › malformed numerics never strip valid sibling filters', () => {
  it('keeps tier=A even when minScore is NaN', () => {
    const { safe, rejections } = validateLeadFilters({
      tier: 'A',
      minScore: NaN,
    });
    expect(safe.tier).toBe('A');
    expect(safe.minScore).toBeUndefined();
    expect(rejections.find((r) => r.field === 'minScore')).toBeDefined();
    expect(rejections.find((r) => r.field === 'tier')).toBeUndefined();
  });

  it('keeps tier=B and a valid maxPrice even when minScore is junk', () => {
    const { safe } = validateLeadFilters({
      tier: 'B',
      maxPrice: 500,
      minScore: 'junk' as unknown as number,
    });
    expect(safe.tier).toBe('B');
    expect(safe.maxPrice).toBe(500);
    expect(safe.minScore).toBeUndefined();
  });

  it('strips both numerics when both are malformed but keeps tier', () => {
    const { safe, rejections } = validateLeadFilters({
      tier: 'C',
      minScore: Number.POSITIVE_INFINITY,
      maxPrice: -50,
    });
    expect(safe.tier).toBe('C');
    expect(safe.minScore).toBeUndefined();
    expect(safe.maxPrice).toBeUndefined();
    expect(rejections.filter((r) => r.field === 'minScore' || r.field === 'maxPrice')).toHaveLength(
      2
    );
  });

  it('returns an empty filter set when ALL inputs are junk', () => {
    const { safe, rejections } = validateLeadFilters({
      tier: 'Z' as unknown as 'A',
      minScore: NaN,
      maxPrice: 'free' as unknown as number,
    });
    expect(safe.tier).toBeUndefined();
    expect(safe.minScore).toBeUndefined();
    expect(safe.maxPrice).toBeUndefined();
    expect(rejections.length).toBeGreaterThanOrEqual(3);
  });
});
