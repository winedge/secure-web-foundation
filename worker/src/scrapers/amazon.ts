import { BaseScraper, type ScrapeResult } from './base.js';
import type { NormalizedProduct } from '../models/product.js';

/** Amazon search / listing scraper via DOM. */
export class AmazonScraper extends BaseScraper {
  async extractProducts(): Promise<ScrapeResult> {
    const page = await this.context.newPage();
    try {
      await page.goto(this.job.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(1500);

      const items = await page.$$eval(
        'div[data-asin][data-asin!=""]',
        (nodes) => nodes.slice(0, 60).map((n) => {
          const el = n as HTMLElement;
          const asin = el.getAttribute('data-asin') || '';
          const title = el.querySelector('h2 a span')?.textContent?.trim() || '';
          const priceWhole = el.querySelector('.a-price .a-price-whole')?.textContent?.replace(/[^\d.]/g, '') || '';
          const priceFraction = el.querySelector('.a-price .a-price-fraction')?.textContent?.replace(/[^\d]/g, '') || '';
          const price = priceWhole ? Number(`${priceWhole}.${priceFraction || '0'}`) : undefined;
          const ratingText = el.querySelector('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt')?.textContent || '';
          const rating = Number((ratingText.match(/[\d.]+/) || [])[0]) || undefined;
          const reviewsText = el.querySelector('span[aria-label$="ratings"], a span.a-size-base')?.textContent || '';
          const reviewCount = Number(reviewsText.replace(/[^\d]/g, '')) || undefined;
          const image = (el.querySelector('img.s-image') as HTMLImageElement | null)?.src;
          const href = (el.querySelector('h2 a') as HTMLAnchorElement | null)?.href;
          return { asin, title, price, rating, reviewCount, image, href };
        }),
      );

      const products: NormalizedProduct[] = items.filter((i) => i.asin).map((i) => ({
        external_product_id: i.asin,
        title: i.title,
        price: i.price ?? undefined,
        currency: 'USD',
        rating: i.rating,
        review_count: i.reviewCount,
        image: i.image,
        product_url: i.href,
      }));

      return { products };
    } finally {
      await page.close();
    }
  }
}
