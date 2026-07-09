import type { BrowserContext } from 'playwright';

const BLOCK_TYPES = new Set(['font', 'media']);
const BLOCK_HOSTS = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'facebook.net', 'facebook.com/tr', 'hotjar.com', 'segment.io',
  'clarity.ms', 'sentry.io', 'newrelic.com', 'branch.io',
];

export async function attachInterceptor(context: BrowserContext) {
  await context.route('**/*', (route) => {
    const req = route.request();
    const type = req.resourceType();
    const url = req.url();
    if (BLOCK_TYPES.has(type)) return route.abort();
    if (BLOCK_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
}
