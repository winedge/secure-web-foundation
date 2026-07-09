import { logger } from './logger.js';
import { browserPool } from './browser/pool.js';
import { startScrapeWorker } from './workers/scrape-worker.js';
import { startPoller, stopPoller } from './scheduler/poller.js';
import { startHealthServer } from './health/server.js';
import { redis } from './queue/connection.js';

async function main() {
  logger.info('starting marketplace scraping worker');
  await browserPool.init();
  const bullWorker = startScrapeWorker();
  startPoller();
  const health = startHealthServer();
  logger.info('worker ready');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    stopPoller();
    try { await bullWorker.close(); } catch { /* noop */ }
    try { health.close(); } catch { /* noop */ }
    try { await browserPool.shutdown(); } catch { /* noop */ }
    try { await redis.quit(); } catch { /* noop */ }
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

main().catch((e) => {
  logger.error({ err: e }, 'fatal boot error');
  process.exit(1);
});
