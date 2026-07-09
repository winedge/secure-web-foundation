import type { BrowserContext, Page } from 'playwright';
import type { ScrapeWatchlistJob } from '../queue/job-types.js';
import type { NormalizedProduct } from '../models/product.js';

export interface ScrapeResult {
  products: NormalizedProduct[];
  metadata?: Record<string, unknown>;
  errorClass?: string;
}

export abstract class BaseScraper {
  constructor(protected job: ScrapeWatchlistJob, protected context: BrowserContext) {}

  /** Optional login flow. Default: noop. Override for marketplaces that need auth. */
  async login(): Promise<void> {}

  /** Warm up (open homepage, load cookies). Default: noop. */
  async prepare(): Promise<void> {}

  /** Extract products from the target URL. Must return normalized products. */
  abstract extractProducts(): Promise<ScrapeResult>;

  /** Optional: detect pagination and follow. Default: single page. */
  async extractPagination(_page: Page): Promise<string[]> { return []; }

  /** Optional: extra metadata about the listing/shop/category. */
  async extractMetadata(): Promise<Record<string, unknown>> { return {}; }

  /** Cleanup. Default: noop; browser context is closed by caller. */
  async cleanup(): Promise<void> {}
}

/** Scroll the page until network is idle or a max is hit. */
export async function autoScroll(page: Page, maxSteps = 20) {
  for (let i = 0; i < maxSteps; i++) {
    const before = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => document.body.scrollHeight);
    if (after === before) break;
  }
}
