import { BaseScraper, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/**
 * Lazada scraper. Lazada embeds product listings as a JSON blob in the page
 * (`window.pageData` / `moduleData`). We parse that first, fall back to DOM.
 */
export class LazadaScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    try {
      await page.goto(this.job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(2000);

      const data = await page.evaluate(() => {
        // @ts-ignore
        const src = window.pageData ?? window.__moduleData__ ?? null;
        return src ? JSON.parse(JSON.stringify(src)) : null;
      });

      const products: NormalizedProduct[] = [];
      const list = data?.mods?.listItems ?? data?.listItems ?? [];
      for (const p of list) {
        if (!p?.itemId && !p?.nid) continue;
        products.push({
          external_product_id: String(p.itemId ?? p.nid),
          title: p.name,
          price: Number(p.price) || undefined,
          original_price: Number(p.originalPrice) || undefined,
          currency: p.priceCurrency,
          discount: Number(p.discount?.replace('%', '')) || undefined,
          rating: p.ratingScore ? Number(p.ratingScore) : undefined,
          review_count: p.review ? Number(p.review) : undefined,
          sold_count: p.itemSoldCntShow ? Number(String(p.itemSoldCntShow).replace(/\D/g, '')) : undefined,
          seller: p.sellerName,
          image: p.image,
          product_url: p.productUrl?.startsWith('http') ? p.productUrl : `https:${p.productUrl}`,
          raw: p,
        });
      }
      return { products };
    } finally {
      await page.close();
    }
  }
}
