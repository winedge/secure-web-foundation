import { describe, it, expect } from 'vitest';
import { normalize, NormalizedProductSchema } from '../src/models/product.js';

describe('NormalizedProduct model', () => {
  it('accepts a minimal valid product', () => {
    expect(NormalizedProductSchema.safeParse({ external_product_id: 'abc' }).success).toBe(true);
  });
  it('rejects products with no id', () => {
    expect(NormalizedProductSchema.safeParse({ title: 'x' }).success).toBe(false);
  });
  it('normalize() drops invalid entries', () => {
    const out = normalize([{ external_product_id: '1' }, { title: 'x' }, { external_product_id: '2', price: 9.99 }]);
    expect(out.length).toBe(2);
    expect(out[1].price).toBe(9.99);
  });
});
