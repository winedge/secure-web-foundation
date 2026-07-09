import { BaseScraper, autoScroll, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/**
 * Temu scraper. Browser-only because Temu ships tokens per request; DOM is
 * relatively stable.
 */
export class TemuScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    try {
      await page.goto(this.job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(2500);
      await autoScroll(page, 8);

      const list = await page.$$eval('a[href*="/goods/"]', (nodes) =>
        nodes.slice(0, 80).map((n) => {
          const el = n as HTMLAnchorElement;
          const card = el.closest('[data-goods-id], div');
          const priceText = card?.querySelector('[class*="Price"], [class*="price"]')?.textContent || '';
          const title = card?.querySelector('[class*="title"], h2, h3')?.textContent?.trim() || '';
          const img = card?.querySelector('img')?.getAttribute('src') || undefined;
          const soldText = card?.querySelector('[class*="sold"], [class*="Sold"]')?.textContent || '';
          const idMatch = el.href.match(/goods\/([\w-]+)/);
          return { id: idMatch?.[1] ?? el.href, title, priceText, img, soldText, href: el.href };
        }),
      );

      const products: NormalizedProduct[] = list.map((d) => ({
        external_product_id: d.id,
        title: d.title,
        price: parseNumber(d.priceText),
        image: d.img,
        product_url: d.href,
        sold_count: parseInt(d.soldText.replace(/\D/g, '')) || undefined,
      }));

      return { products };
    } finally {
      await page.close();
    }
  }
}

function parseNumber(v: string) {
  const n = Number(v.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
