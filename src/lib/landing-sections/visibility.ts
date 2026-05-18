/**
 * Conditional visibility evaluator for landing sections.
 *
 * Sections may include a `visibility` config with one or more rules referencing
 * either the audience (device, UTM params, query, referrer, visitor state) or
 * the live form response values. This module derives an `AudienceContext` from
 * the browser and exposes `isSectionVisible` to combine the manual `visible`
 * toggle with the rule evaluation.
 */

import type { Section, VisibilityConfig, VisibilityRule } from './types';

export type Device = 'desktop' | 'tablet' | 'mobile';
export type Visitor = 'new' | 'returning';

export interface AudienceContext {
  device: Device;
  visitor: Visitor;
  referrer: string;
  utm: Record<string, string>;
  query: Record<string, string>;
}

export interface VisibilityContext {
  audience: AudienceContext;
  form: Record<string, any>;
}

const VISITOR_KEY = 'lp_visitor_seen';

export function buildAudienceContext(opts?: { slug?: string }): AudienceContext {
  if (typeof window === 'undefined') {
    return { device: 'desktop', visitor: 'new', referrer: '', utm: {}, query: {} };
  }
  const w = window.innerWidth || 1024;
  const device: Device = w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';

  const params = new URLSearchParams(window.location.search);
  const query: Record<string, string> = {};
  const utm: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
    if (key.startsWith('utm_')) utm[key.slice(4)] = value;
  });

  let visitor: Visitor = 'new';
  try {
    const k = opts?.slug ? `${VISITOR_KEY}:${opts.slug}` : VISITOR_KEY;
    if (localStorage.getItem(k)) visitor = 'returning';
    else localStorage.setItem(k, '1');
  } catch {
    /* private mode */
  }

  return {
    device,
    visitor,
    referrer: document.referrer || '',
    utm,
    query,
  };
}

function resolveValue(rule: VisibilityRule, ctx: VisibilityContext): any {
  if (rule.source === 'form') {
    return ctx.form?.[rule.key];
  }
  // audience
  const { audience } = ctx;
  if (rule.key.startsWith('query:')) return audience.query[rule.key.slice(6)];
  if (rule.key.startsWith('utm_')) return audience.utm[rule.key.slice(4)];
  switch (rule.key) {
    case 'device':
      return audience.device;
    case 'visitor':
      return audience.visitor;
    case 'referrer':
      return audience.referrer;
    default:
      return undefined;
  }
}

function compare(actual: any, rule: VisibilityRule): boolean {
  const expected = (rule.value ?? '').trim();
  const a = actual == null ? '' : String(actual).toLowerCase();
  const e = expected.toLowerCase();
  switch (rule.operator) {
    case 'equals':
      return a === e;
    case 'not_equals':
      return a !== e;
    case 'contains':
      return a.includes(e);
    case 'not_contains':
      return !a.includes(e);
    case 'in':
      return e.split(',').map((s) => s.trim()).filter(Boolean).includes(a);
    case 'not_in':
      return !e.split(',').map((s) => s.trim()).filter(Boolean).includes(a);
    case 'is_empty':
      return a === '' || actual == null;
    case 'is_not_empty':
      return !(a === '' || actual == null);
    case 'truthy':
      return Boolean(actual) && a !== 'false' && a !== '0';
    case 'falsy':
      return !actual || a === 'false' || a === '0';
    default:
      return true;
  }
}

export function evaluateVisibility(cfg: VisibilityConfig | undefined, ctx: VisibilityContext): boolean {
  if (!cfg || !cfg.rules || cfg.rules.length === 0) return true;
  const results = cfg.rules.map((r) => compare(resolveValue(r, ctx), r));
  return cfg.mode === 'any' ? results.some(Boolean) : results.every(Boolean);
}

export function isSectionVisible(section: Section, ctx: VisibilityContext): boolean {
  if (!section.visible) return false;
  return evaluateVisibility(section.visibility, ctx);
}

export const AUDIENCE_KEY_OPTIONS: { value: string; label: string }[] = [
  { value: 'device', label: 'Device' },
  { value: 'visitor', label: 'Visitor (new / returning)' },
  { value: 'referrer', label: 'Referrer URL' },
  { value: 'utm_source', label: 'UTM source' },
  { value: 'utm_medium', label: 'UTM medium' },
  { value: 'utm_campaign', label: 'UTM campaign' },
  { value: 'utm_content', label: 'UTM content' },
  { value: 'utm_term', label: 'UTM term' },
];

export const OPERATOR_OPTIONS: { value: VisibilityRule['operator']; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'in', label: 'is one of (comma separated)' },
  { value: 'not_in', label: 'is not one of' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'truthy', label: 'is truthy' },
  { value: 'falsy', label: 'is falsy' },
];
