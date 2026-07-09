import { fetch } from 'undici';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { NormalizedProduct } from '../models/product.js';

export interface CallbackPayload {
  job_id: string;
  status: 'succeeded' | 'failed' | 'dead';
  error_class?: string;
  duration_ms: number;
  products?: NormalizedProduct[];
  logs?: Array<{ level: string; message: string; error_class?: string; meta?: unknown }>;
}

export async function postCallback(payload: CallbackPayload) {
  const url = `${config.SUPABASE_FUNCTIONS_URL}/scrape-callback`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-token': config.WORKER_SHARED_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, text }, 'callback failed');
    }
  } catch (e) {
    logger.error({ err: e }, 'callback network error');
  }
}

export async function fetchDueJobs(): Promise<any[]> {
  const url = `${config.SUPABASE_FUNCTIONS_URL}/scrape-enqueue`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-token': config.WORKER_SHARED_TOKEN,
      },
      body: JSON.stringify({ limit: config.POLLER_BATCH }),
    });
    if (!res.ok) {
      logger.error({ status: res.status }, 'enqueue poll failed');
      return [];
    }
    const body = (await res.json()) as { jobs?: any[] };
    return body.jobs ?? [];
  } catch (e) {
    logger.error({ err: e }, 'enqueue poll network error');
    return [];
  }
}
