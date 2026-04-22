/**
 * Currency helpers for multi-currency pricing display & checkout.
 *
 * - Prices are stored/quoted in USD as the base unit.
 * - For India (country = 'IN'), we display & charge in INR using a live FX rate.
 * - Live FX is fetched from a free public endpoint (exchangerate.host) and
 *   cached in localStorage for 1 hour to avoid excessive network calls.
 * - Fallback rate is used if the API call fails so the UI never breaks.
 */

export type SupportedCurrency = 'USD' | 'INR';

const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  INR: 88, // Conservative fallback if live FX is unavailable
};

const CACHE_KEY = 'fx_rates_v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedRates {
  fetchedAt: number;
  rates: Partial<Record<SupportedCurrency, number>>;
}

/** Map an ISO-3166 alpha-2 country code to the billing currency we charge in. */
export function currencyForCountry(country?: string | null): SupportedCurrency {
  const c = (country ?? '').toUpperCase().trim();
  if (c === 'IN') return 'INR';
  return 'USD';
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (!parsed?.fetchedAt || !parsed?.rates) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: Partial<Record<SupportedCurrency, number>>) {
  try {
    const payload: CachedRates = { fetchedAt: Date.now(), rates };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

/**
 * Fetch a live USD → target currency rate. Cached for 1 hour.
 * Falls back to a conservative hardcoded rate on failure.
 */
export async function getUsdRate(target: SupportedCurrency): Promise<number> {
  if (target === 'USD') return 1;

  const cached = readCache();
  if (cached?.rates?.[target]) return cached.rates[target] as number;

  try {
    const resp = await fetch(
      `https://api.exchangerate.host/latest?base=USD&symbols=${target}`,
    );
    if (!resp.ok) throw new Error(`FX request failed: ${resp.status}`);
    const data = (await resp.json()) as { rates?: Record<string, number> };
    const rate = data?.rates?.[target];
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
      throw new Error('Invalid FX response');
    }
    const merged = { ...(cached?.rates ?? {}), [target]: rate };
    writeCache(merged);
    return rate;
  } catch {
    return FALLBACK_RATES[target];
  }
}

/** Convert a USD amount to a target currency using a known rate. */
export function convertFromUsd(amountUsd: number, rate: number): number {
  return amountUsd * rate;
}

/** Format a number as currency for display. */
export function formatMoney(amount: number, currency: SupportedCurrency): string {
  // INR rounds to whole rupees for cleaner pricing UX.
  const fractionDigits = currency === 'INR' ? 0 : 2;
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
