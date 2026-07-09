import { BaseScraper, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/** eBay search / listing scraper via DOM. */
export class EbayScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    try {
      await page.goto(this.job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1200);

      const items = await page.$$eval('li.s-item', (nodes) => nodes.slice(1, 80).map((n) => {
        const el = n as HTMLElement;
        const title = el.querySelector('.s-item__title')?.textContent?.trim() || '';
        const priceText = el.querySelector('.s-item__price')?.textContent?.trim() || '';
        const seller = el.querySelector('.s-item__seller-info-text')?.textContent?.trim() || '';
        const href = (el.querySelector('a.s-item__link') as HTMLAnchorElement | null)?.href;
        const idMatch = href?.match(/itm\/(\d+)/);
        const image = (el.querySelector('.s-item__image img') as HTMLImageElement | null)?.src;
        const soldText = el.querySelector('.s-item__quantitySold, .s-item__hotness')?.textContent || '';
        return { id: idMatch?.[1], title, priceText, seller, href, image, soldText };
      }));

      const products: NormalizedProduct[] = items.filter((i) => i.id).map((i) => ({
        external_product_id: i.id!,
        title: i.title,
        price: parseNumber(i.priceText),
        currency: (i.priceText.match(/[A-Z]{3}/) || [])[0] || 'USD',
        seller: i.seller,
        image: i.image,
        product_url: i.href,
        sold_count: parseInt(i.soldText.replace(/\D/g, '')) || undefined,
      }));

      return { products };
    } finally {
      await page.close();
    }
  }
}

function parseNumber(v: string) {
  const n = Number(v.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
