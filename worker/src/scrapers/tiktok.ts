import { BaseScraper, autoScroll, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/**
 * TikTok Shop scraper.
 * Strategy: try to sniff the internal JSON XHR calls first, fall back to DOM.
 * Real production use requires a residential proxy - TikTok fingerprints heavily.
 */
export class TikTokScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    const apiHits: any[] = [];

    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/shop/') || url.includes('/api/product/') || url.includes('product_detail')) {
        try { apiHits.push(await res.json()); } catch { /* noop */ }
      }
    });

    try {
      await page.goto(this.job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(3000);
      await autoScroll(page, 6);

      // API-first
      const fromApi = extractProductsFromTikTokApi(apiHits, this.job.url);
      if (fromApi.length) return { products: fromApi };

      // DOM fallback
      const dom = await page.$$eval(
        'a[href*="/product/"]',
        (nodes) => nodes.slice(0, 60).map((n) => {
          const el = n as HTMLAnchorElement;
          const container = el.closest('[data-e2e], div');
          const priceText = container?.querySelector('[class*="price"]')?.textContent || '';
          const title = container?.querySelector('[class*="title"], h3, h4')?.textContent?.trim() || el.textContent?.trim() || '';
          const idMatch = el.href.match(/product\/(\d+)/);
          return { id: idMatch?.[1] ?? el.href, title, priceText, href: el.href };
        }),
      );

      const products: NormalizedProduct[] = dom.map((d) => ({
        external_product_id: d.id,
        title: d.title,
        price: parseNumber(d.priceText),
        product_url: d.href,
      }));

      return { products };
    } finally {
      await page.close();
    }
  }
}

function extractProductsFromTikTokApi(hits: any[], sourceUrl: string): NormalizedProduct[] {
  const out: NormalizedProduct[] = [];
  for (const h of hits) {
    const list = h?.data?.products || h?.data?.product_list || h?.products || [];
    for (const p of list) {
      if (!p?.product_id && !p?.id) continue;
      out.push({
        external_product_id: String(p.product_id ?? p.id),
        title: p.title ?? p.name,
        price: parseNumber(p.price?.real_price ?? p.price?.value ?? p.price),
        original_price: parseNumber(p.price?.original_price),
        currency: p.price?.currency,
        rating: p.review?.rating ?? p.rating,
        review_count: p.review?.count ?? p.review_count,
        sold_count: p.sold_count ?? p.sales,
        image: p.cover?.url ?? p.image,
        product_url: p.share_url ?? sourceUrl,
        raw: p,
      });
    }
  }
  return out;
}

function parseNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
