import { z } from 'zod';

const Schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_FUNCTIONS_URL: z.string().url(),
  WORKER_SHARED_TOKEN: z.string().min(16),
  REDIS_URL: z.string().default('redis://redis:6379'),
  CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  BROWSER_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(2),
  PROXY_URL: z.string().optional().default(''),
  PROXY_MARKETPLACES: z.string().default('tiktok_shop,shopee,lazada'),
  POLLER_INTERVAL_MS: z.coerce.number().int().min(5000).default(60000),
  POLLER_BATCH: z.coerce.number().int().min(1).max(200).default(25),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(3001),
});

export const config = Schema.parse(process.env);
export const proxyMarketplaces = new Set(
  config.PROXY_MARKETPLACES.split(',').map((s) => s.trim()).filter(Boolean),
);
