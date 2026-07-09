import { chromium, type Browser, type BrowserContext } from 'playwright';
import { config, proxyMarketplaces } from '../config.js';
import { logger } from '../logger.js';
import { attachInterceptor } from './interceptor.js';
import { applyStealth, randomUserAgent } from './stealth.js';

interface PooledBrowser {
  browser: Browser;
  jobsHandled: number;
}

const RECYCLE_AFTER = 500;

class BrowserPool {
  private pool: PooledBrowser[] = [];
  private queue: Array<(b: PooledBrowser) => void> = [];
  private closing = false;

  async init() {
    for (let i = 0; i < config.BROWSER_POOL_SIZE; i++) {
      this.pool.push({ browser: await this.launch(), jobsHandled: 0 });
    }
    logger.info({ size: config.BROWSER_POOL_SIZE }, 'browser pool ready');
  }

  private async launch(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }

  async acquire(): Promise<PooledBrowser> {
    if (this.closing) throw new Error('pool closing');
    const free = this.pool.find((p) => (p as any)._inUse !== true);
    if (free) { (free as any)._inUse = true; return free; }
    return await new Promise((resolve) => this.queue.push(resolve));
  }

  async release(p: PooledBrowser) {
    p.jobsHandled++;
    if (p.jobsHandled >= RECYCLE_AFTER) {
      logger.info({ jobs: p.jobsHandled }, 'recycling browser');
      try { await p.browser.close(); } catch { /* noop */ }
      p.browser = await this.launch();
      p.jobsHandled = 0;
    }
    (p as any)._inUse = false;
    const next = this.queue.shift();
    if (next) { (p as any)._inUse = true; next(p); }
  }

  async newContext(marketplace: string): Promise<{ context: BrowserContext; release: () => Promise<void> }> {
    const pooled = await this.acquire();
    const useProxy = !!config.PROXY_URL && proxyMarketplaces.has(marketplace);
    const context = await pooled.browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      proxy: useProxy ? { server: config.PROXY_URL } : undefined,
    });
    await applyStealth(context);
    await attachInterceptor(context);
    return {
      context,
      release: async () => {
        try { await context.close(); } catch { /* noop */ }
        await this.release(pooled);
      },
    };
  }

  async shutdown() {
    this.closing = true;
    for (const p of this.pool) { try { await p.browser.close(); } catch { /* noop */ } }
    this.pool = [];
  }

  stats() { return { size: this.pool.length, busy: this.pool.filter((p) => (p as any)._inUse).length }; }
}

export const browserPool = new BrowserPool();
