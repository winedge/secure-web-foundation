import { Queue } from 'bullmq';
import { redis } from './connection.js';
import type { ScrapeWatchlistJob } from './job-types.js';

export const SCRAPE_QUEUE = 'scrape-watchlists';

export const scrapeQueue = new Queue<ScrapeWatchlistJob>(SCRAPE_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

const PRIORITY_MAP = { high: 1, medium: 5, low: 10 } as const;

export async function enqueueScrape(job: ScrapeWatchlistJob) {
  await scrapeQueue.add(job.marketplace, job, {
    jobId: job.job_id,
    priority: PRIORITY_MAP[job.priority] ?? 5,
  });
}
