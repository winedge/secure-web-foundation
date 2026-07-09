import { config } from '../config.js';
import { logger } from '../logger.js';
import { fetchDueJobs } from '../callback/client.js';
import { enqueueScrape } from '../queue/scrape-queue.js';

let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const jobs = await fetchDueJobs();
    if (jobs.length) logger.info({ count: jobs.length }, 'polled due jobs');
    for (const j of jobs) {
      await enqueueScrape({
        job_id: j.job_id,
        watchlist_id: j.watchlist_id,
        firm_id: j.firm_id,
        marketplace: j.marketplace,
        url: j.url,
        entity_type: j.entity_type,
        priority: j.priority ?? 'medium',
      });
    }
  } catch (e) {
    logger.error({ err: e }, 'poller tick failed');
  } finally {
    running = false;
  }
}

export function startPoller() {
  tick().catch(() => {});
  timer = setInterval(() => { tick().catch(() => {}); }, config.POLLER_INTERVAL_MS);
}

export function stopPoller() {
  if (timer) { clearInterval(timer); timer = null; }
}
