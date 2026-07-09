import { z } from 'zod';

export const NormalizedProductSchema = z.object({
  external_product_id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nullable().optional(),
  original_price: z.number().nullable().optional(),
  currency: z.string().optional(),
  discount: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  review_count: z.number().int().nullable().optional(),
  sold_count: z.number().int().nullable().optional(),
  seller: z.string().optional(),
  seller_id: z.string().optional(),
  seller_rating: z.number().nullable().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  product_url: z.string().optional(),
  category: z.string().optional(),
  stock_status: z.string().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});
export type NormalizedProduct = z.infer<typeof NormalizedProductSchema>;

export function normalize(list: unknown[]): NormalizedProduct[] {
  const out: NormalizedProduct[] = [];
  for (const item of list) {
    const parsed = NormalizedProductSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
