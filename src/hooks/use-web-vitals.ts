import { useEffect, useState } from 'react';
import { onLCP, onCLS, onINP, onFCP, onTTFB, type Metric } from 'web-vitals';

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalValue {
  value: number | null;
  rating: WebVitalRating | null;
}

export interface WebVitals {
  LCP: WebVitalValue;
  CLS: WebVitalValue;
  INP: WebVitalValue;
  FCP: WebVitalValue;
  TTFB: WebVitalValue;
}

const empty: WebVitalValue = { value: null, rating: null };

/**
 * Subscribes to live Core Web Vitals (LCP, CLS, INP) plus supporting metrics
 * (FCP, TTFB) for the current preview document. Re-emits on each update
 * (e.g. as INP/CLS evolve with user interaction).
 */
export function useWebVitals(enabled: boolean): WebVitals {
  const [vitals, setVitals] = useState<WebVitals>({
    LCP: empty, CLS: empty, INP: empty, FCP: empty, TTFB: empty,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const update = (key: keyof WebVitals) => (m: Metric) => {
      setVitals((prev) => ({
        ...prev,
        [key]: { value: m.value, rating: m.rating as WebVitalRating },
      }));
    };

    const opts = { reportAllChanges: true };
    onLCP(update('LCP'), opts);
    onCLS(update('CLS'), opts);
    onINP(update('INP'), opts);
    onFCP(update('FCP'), opts);
    onTTFB(update('TTFB'));
  }, [enabled]);

  return vitals;
}

export function formatVital(key: keyof WebVitals, v: WebVitalValue): string {
  if (v.value == null) return '—';
  if (key === 'CLS') return v.value.toFixed(3);
  if (v.value >= 1000) return `${(v.value / 1000).toFixed(2)}s`;
  return `${Math.round(v.value)}ms`;
}

export function ratingTone(rating: WebVitalRating | null): string {
  if (rating === 'good') return 'text-emerald-500';
  if (rating === 'needs-improvement') return 'text-amber-500';
  if (rating === 'poor') return 'text-destructive';
  return 'text-muted-foreground';
}

export function ratingLabel(rating: WebVitalRating | null): string {
  if (rating === 'good') return 'Good';
  if (rating === 'needs-improvement') return 'Improve';
  if (rating === 'poor') return 'Poor';
  return 'Waiting';
}
