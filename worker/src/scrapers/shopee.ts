import { fetch } from 'undici';
import { BaseScraper, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/**
 * Shopee scraper. Uses the /api/v4/search/search_items JSON endpoint directly
 * once cookies are established via a browser visit. Very reliable when the IP
 * is allowed by Akamai.
 */
export class ShopeeScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    try {
      await page.goto(new URL(this.job.url).origin, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1500);

      const cookies = await this.context.cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      const origin = new URL(this.job.url).origin;

      // Category / search / shop urls -> use search_items
      const parsed = parseShopeeUrl(this.job.url);
      const apiUrl = `${origin}/api/v4/search/search_items?${new URLSearchParams({
        by: 'relevancy', limit: '60', newest: '0', order: 'desc', page_type: 'search',
        scenario: 'PAGE_GLOBAL_SEARCH', version: '2',
        ...parsed,
      })}`;

      const res = await fetch(apiUrl, {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': await page.evaluate(() => navigator.userAgent),
          'x-api-source': 'pc',
          'x-shopee-language': 'en',
          'Referer': this.job.url,
        },
      });

      if (!res.ok) return { products: [], errorClass: 'http_error' };
      const body: any = await res.json();
      const items = (body?.items ?? []).map((it: any) => {
        const p = it.item_basic ?? it;
        return {
          external_product_id: String(p.itemid ?? p.item_id),
          title: p.name,
          price: p.price ? p.price / 100000 : undefined,
          original_price: p.price_before_discount ? p.price_before_discount / 100000 : undefined,
          currency: p.currency,
          rating: p.item_rating?.rating_star,
          review_count: p.item_rating?.rating_count?.[0],
          sold_count: p.historical_sold ?? p.sold,
          image: p.image ? `${origin}/file/${p.image}` : undefined,
          product_url: `${origin}/product/${p.shopid}/${p.itemid}`,
          stock_status: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          raw: p,
        } as NormalizedProduct;
      });
      return { products: items };
    } finally {
      await page.close();
    }
  }
}

function parseShopeeUrl(url: string): Record<string, string> {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('keyword') ?? '';
    if (q) return { keyword: q };
    // /shop/{shopid}/... -> use shop_items?
    const shopMatch = u.pathname.match(/\/shop\/(\d+)/);
    if (shopMatch) return { match_id: shopMatch[1], page_type: 'shop' };
    // Fallback: use last slug as keyword
    const slug = u.pathname.split('/').filter(Boolean).pop() || '';
    return { keyword: slug.replace(/-/g, ' ') };
  } catch {
    return { keyword: '' };
  }
}
