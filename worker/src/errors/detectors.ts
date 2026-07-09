export type ErrorClass =
  | 'captcha' | 'cloudflare' | 'login_required' | 'empty_results'
  | 'rate_limited' | 'timeout' | 'http_error' | 'parse_error' | 'unknown';

export function classifyPage(html: string, status?: number): ErrorClass | null {
  const h = html.toLowerCase();
  if (status === 429 || h.includes('too many requests') || h.includes('rate limit')) return 'rate_limited';
  if (h.includes('cf-challenge') || h.includes('cloudflare') && h.includes('just a moment')) return 'cloudflare';
  if (h.includes('captcha') || h.includes('slider') && h.includes('verify')) return 'captcha';
  if (h.includes('sign in') && h.includes('required')) return 'login_required';
  if (status && status >= 400) return 'http_error';
  return null;
}
