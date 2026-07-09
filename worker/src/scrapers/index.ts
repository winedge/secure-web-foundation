import type { BrowserContext } from 'playwright';
import type { ScrapeWatchlistJob } from '../queue/job-types.js';
import { BaseScraper } from './base.js';
import { TikTokScraper } from './tiktok.js';
import { ShopeeScraper } from './shopee.js';
import { LazadaScraper } from './lazada.js';
import { TemuScraper } from './temu.js';
import { AmazonScraper } from './amazon.js';
import { EbayScraper } from './ebay.js';

export function pickScraper(job: ScrapeWatchlistJob, ctx: BrowserContext): BaseScraper {
  switch (job.marketplace) {
    case 'tiktok_shop': return new TikTokScraper(job, ctx);
    case 'shopee': return new ShopeeScraper(job, ctx);
    case 'lazada': return new LazadaScraper(job, ctx);
    case 'temu': return new TemuScraper(job, ctx);
    case 'amazon': return new AmazonScraper(job, ctx);
    case 'ebay': return new EbayScraper(job, ctx);
    default: throw new Error(`unsupported marketplace: ${job.marketplace}`);
  }
}
