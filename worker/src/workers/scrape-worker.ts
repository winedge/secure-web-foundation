import { Worker } from 'bullmq';
import { redis } from '../queue/connection.js';
import { SCRAPE_QUEUE } from '../queue/scrape-queue.js';
import type { ScrapeWatchlistJob } from '../queue/job-types.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { browserPool } from '../browser/pool.js';
import { pickScraper } from '../scrapers/index.js';
import { postCallback } from '../callback/client.js';
import { normalize } from '../models/product.js';

let inFlight = 0;
export function jobsInFlight() { return inFlight; }

export function startScrapeWorker() {
  const worker = new Worker<ScrapeWatchlistJob>(
    SCRAPE_QUEUE,
    async (job) => {
      inFlight++;
      const started = Date.now();
      const data = job.data;
      const log = logger.child({ job_id: data.job_id, marketplace: data.marketplace });
      log.info({ url: data.url }, 'scrape start');

      const { context, release } = await browserPool.newContext(data.marketplace);
      try {
        const scraper = pickScraper(data, context);
        await scraper.prepare();
        const result = await scraper.extractProducts();
        const products = normalize(result.products);

        if (result.errorClass && products.length === 0) {
          await postCallback({
            job_id: data.job_id,
            status: 'failed',
            error_class: result.errorClass,
            duration_ms: Date.now() - started,
            products: [],
            logs: [{ level: 'error', message: `scraper returned ${result.errorClass}`, error_class: result.errorClass }],
          });
          throw new Error(result.errorClass);
        }

        await postCallback({
          job_id: data.job_id,
          status: 'succeeded',
          duration_ms: Date.now() - started,
          products,
        });
        log.info({ count: products.length, ms: Date.now() - started }, 'scrape ok');
      } catch (e: any) {
        log.error({ err: e?.message }, 'scrape failed');
        await postCallback({
          job_id: data.job_id,
          status: job.attemptsMade + 1 >= (job.opts.attempts ?? 3) ? 'dead' : 'failed',
          error_class: e?.name || 'unknown',
          duration_ms: Date.now() - started,
          logs: [{ level: 'error', message: String(e?.message || e) }],
        });
        throw e;
      } finally {
        await release();
        inFlight--;
      }
    },
    { connection: redis, concurrency: config.CONCURRENCY },
  );

  worker.on('failed', (job, err) => logger.warn({ id: job?.id, err: err.message }, 'job failed'));
  return worker;
}
